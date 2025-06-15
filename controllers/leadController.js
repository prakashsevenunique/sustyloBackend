const SalonLead = require("../models/lead.model.js");
const Salon = require("../models/salon.js");
const User = require('../models/User.js');
const Wallet = require('../models/Wallet.js');
const mongoose = require("mongoose");

exports.createLead = async (req, res) => {
    try {
        const {
            salonOwnerName,
            salonName,
            mobileNumber,
            email,
            address
        } = req.body;

        if (!salonName || !salonOwnerName || !mobileNumber || !email || !address) {
            return res.status(400).json({ error: "All fields are required." });
        }
        const newLead = new SalonLead({
            salonName,
            salonOwnerName,
            mobileNumber,
            email,
            address
        });
        await newLead.save();
        res.status(201).json({ message: "Lead created successfully", data: newLead });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllLeads = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status = "new",
            search,
            sortBy = "createdAt",
            order = "desc"
        } = req.query;

        const query = {};

        if (status === "approved") {
            return res.status(400).json({ message: "you not authorized to see Approved leads" });
        }

        if (status) {
            query.status = status || "new";
        }
        if (search) {
            query.$or = [
                { salonName: { $regex: search, $options: "i" } },
                { salonOwnerName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const sortOrder = order === "asc" ? 1 : -1;
        const leads = await SalonLead.find(query)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(Number(limit));
        const total = await SalonLead.countDocuments(query);
        res.status(200).json({
            data: leads,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getLeadById = async (req, res) => {
    try {
        const lead = await SalonLead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: "Lead not found" });
        res.status(200).json(lead);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateLeadStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { status, salonDetails } = req.body;
        const { id: leadId } = req.params;

        const validStatuses = ["new", "contacted", "reviewed", "approved", "rejected"];
        if (!validStatuses.includes(status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Invalid status" });
        }
        const [lead] = await Promise.all([
            SalonLead.findById(leadId).session(session),
        ]);

        if (!lead) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Lead not found" });
        }

        lead.status = status;
        await lead.save({ session });

        let salon = null;
        let user = null;

        if (status === "approved" && salonDetails) {
            const {
                salonTitle, salonDescription, locationMapUrl,
                socialLinks, openingHours, facilities, services,
                category, bankDetails, latitude, longitude,
                aadharNumber, pancardNumber
            } = salonDetails;


            const [existingUser, existingSalon] = await Promise.all([
                User.findOne({ mobileNumber: lead.mobileNumber }).session(session),
                Salon.findOne({ mobile: lead.mobileNumber }).session(session)
            ]);

            if (existingSalon) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Salon with this mobile number already exists" });
            }

            user = existingUser;
            const newReferralCode = `SALON${Math.floor(1000 + Math.random() * 9000)}`;

            if (!user) {
                user = new User({
                    mobileNumber: lead.mobileNumber,
                    name: lead.salonOwnerName,
                    email: lead.email,
                    referralCode: newReferralCode,
                    address: lead.address,
                    role: "shop_owner"
                });

                await user.save({ session });

                const wallet = new Wallet({
                    user: user._id,
                    balance: 0,
                });
                await wallet.save({ session });

                user.wallet = wallet._id;
                await user.save({ session });
            } else {
                if (user.role !== 'shop_owner') {
                    user.role == "admin" ? user.role = "admin" : user.role = "shop_owner";
                    await user.save({ session });
                }
            }

            salon = new Salon({
                salonowner: user._id,
                salonName: lead.salonName,
                mobile: lead.mobileNumber,
                email: lead.email,
                salonAddress: lead.address,
                locationMapUrl,
                salonTitle,
                salonDescription,
                socialLinks,
                openingHours,
                facilities,
                services,
                category,
                bankDetails,
                latitude,
                longitude,
                aadharNumber,
                pancardNumber,
                status: "approved"
            });
            await salon.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            message: "Lead status updated",
            lead,
            salon,
            user
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            error: error.message
        });
    }
};

exports.updateSalonMedia = async (req, res) => {
    try {
      const { userId } = req.params;
  
      // Validate userId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid User ID" });
      }
  
      // Get User
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Get associated salon
      let salon = await Salon.findOne({ salonowner: user._id });
      if (!salon) {
        return res.status(404).json({ error: "Salon not found for this user" });
      }
  
      let salonPhotos = salon.salonPhotos || [];
      let salonAgreement = salon.salonAgreement || "";
  
      if (req.files && req.files["salonPhotos"]) {
        salonPhotos = req.files["salonPhotos"].map((file) => file.path);
      }
  
      if (req.files && req.files["salonAgreement"]) {
        salonAgreement = req.files["salonAgreement"][0].path;
      }
  
      salon = await Salon.findByIdAndUpdate(
          salon._id,
        { salonPhotos, salonAgreement },
        { new: true }
      );
  
      res
        .status(200)
        .json({ message: "Salon media updated successfully", salon });
    } catch (error) {
      console.error("❌ Error updating salon media:", error);
      res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    }
  };

exports.deleteLead = async (req, res) => {
    try {
        const lead = await SalonLead.findByIdAndDelete(req.params.id);
        if (!lead) return res.status(404).json({ message: "Lead not found" });
        res.status(200).json({ message: "Lead deleted" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
