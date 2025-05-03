const express = require("express");
const router = express.Router();
const Booking = require('../models/Booking');
const Salon = require('../models/salon');
const PayIn = require('../models/payin');
const PayOut = require('../models/payout');
const moment = require('moment');
const commission = require("../models/commissionModel");

router.get("/salonowner", async (req, res) => {
    try {
        const { salonOwnerId } = req.query;
        const salons = await Salon.findOne({ salonowner: salonOwnerId });

        if (!salons) {
            return res.status(200).json({
                totalBookings: 0,
                todayBookings: 0,
                completedBookings: 0,
                confirmedBookings: 0,
                cancelledBookings: 0,
                pendingBookings: 0,
                revenue: 0,
                upcomingBookings: [],
                bookingTrends: [],
                popularServices: [],
                message: "No salons found for this owner"
            });
        }

        const today = moment().format('YYYY-MM-DD');

        const allBookings = await Booking.find({ salonId: { $in: [salons._id] } });

        const totalBookings = allBookings.length;
        const todayBookings = allBookings.filter(booking => booking.date === today).length;
        const completedBookings = allBookings.filter(booking => booking.status === 'Completed').length;
        const confirmedBookings = allBookings.filter(booking => booking.status === 'Confirmed').length;
        const cancelledBookings = allBookings.filter(booking => booking.status === 'Cancelled').length;
        const pendingBookings = allBookings.filter(booking => booking.status === 'Pending').length;

        const commissionPack = await commission.findOne({
            userId: salons.salonowner,
            serviceType: "booking"
        })

        const revenue = allBookings
            .filter(booking => booking.status === 'Completed' || booking.status === 'Confirmed')
            .reduce((sum, booking) => sum + booking.totalAmount, 0);

        const upcomingBookings = await Booking.find({
            salonId: { $in: [salons._id] },
            date: today,
            status: 'Confirmed'
        }).sort({ timeSlot: 1 })
            .populate('userId', 'name email phone');

        const bookingTrends = [];
        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            const count = allBookings.filter(booking => booking.date === date).length;
            bookingTrends.push({ date, count });
        }

        const serviceCounts = {};
        allBookings.forEach(booking => {
            booking.services.forEach(service => {
                if (serviceCounts[service.name]) {
                    serviceCounts[service.name]++;
                } else {
                    serviceCounts[service.name] = 1;
                }
            });
        });

        const popularServices = Object.entries(serviceCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5 services

        let finalRevenue = commissionPack.type == "percentage" ? (revenue * (100 - commissionPack.commission)) / 100 : revenue - commissionPack.commission * totalBookings;

        res.status(200).json({
            totalBookings,
            todayBookings,
            completedBookings,
            confirmedBookings,
            cancelledBookings,
            pendingBookings,
            finalRevenue,
            upcomingBookings,
            bookingTrends,
            popularServices,
            message: "Dashboard data fetched successfully"
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            message: "Error fetching dashboard data",
            error: error.message
        });
    }
});


router.get("/payment", async (req, res) => {
    try {
        const { userId } = req.query; // Assuming user ID is available in req.user
        const [payIns, payOuts] = await Promise.all([
            PayIn.find({ userId }),
            PayOut.find({ userId })
        ]);

        const totalPayIn = payIns.reduce((sum, payIn) => sum + payIn.amount, 0);
        const pendingPayIn = payIns.filter(p => p.status === 'Pending').length;
        const approvedPayIn = payIns.filter(p => p.status === 'Approved').length;
        const failedPayIn = payIns.filter(p => p.status === 'Failed').length;

        const totalPayOut = payOuts.reduce((sum, payOut) => sum + parseFloat(payOut.amount), 0);
        const pendingPayOut = payOuts.filter(p => p.status === 'Pending').length;
        const approvedPayOut = payOuts.filter(p => p.status === 'Approved').length;
        const failedPayOut = payOuts.filter(p => p.status === 'Failed').length;

        const recentPayIns = payIns
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        const recentPayOuts = payOuts
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        const payInTrends = getPaymentTrends(payIns, 30);
        const payOutTrends = getPaymentTrends(payOuts, 30);

        res.status(200).json({
            summary: {
                payIn: {
                    total: totalPayIn,
                    pending: pendingPayIn,
                    approved: approvedPayIn,
                    failed: failedPayIn
                },
                payOut: {
                    total: totalPayOut,
                    pending: pendingPayOut,
                    approved: approvedPayOut,
                    failed: failedPayOut
                },
                netAmount: totalPayIn - totalPayOut
            },
            recentTransactions: {
                payIns: recentPayIns,
                payOuts: recentPayOuts
            },
            trends: {
                payIn: payInTrends,
                payOut: payOutTrends
            },
            message: "Payment dashboard data fetched successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching payment dashboard data",
            error: error.message
        });
    }
});


function getPaymentTrends(transactions, days) {
    const trends = [];
    const now = moment();

    for (let i = days - 1; i >= 0; i--) {
        const date = now.clone().subtract(i, 'days').format('YYYY-MM-DD');
        const amount = transactions
            .filter(t => moment(t.createdAt).format('YYYY-MM-DD') === date)
            .reduce((sum, t) => sum + (t.amount ? parseFloat(t.amount) : 0), 0);

        trends.push({ date, amount });
    }

    return trends;
}

module.exports = router;