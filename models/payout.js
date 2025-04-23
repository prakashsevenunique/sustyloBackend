const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const payOutSchema = new mongoose.Schema(
    {
        userId : {
            type:Schema.Types.ObjectId,
            ref:"User",
            required: true,
        },
        amount :{

            type:String,
            required:true
        }, 
        reference:{
            unique:true,
            type:String,
            required:false
        }, 
        trans_mode :{

            type : String,
            required:false,
        },
        account:{

            type:String,
            required:false
        },
        ifsc :{

            type:String,
            required:false
        },
        name:{

            type:String,
            required:true
        }, 
        mobile:{

            type:String,
            required:true
        }, 
        
        description: { type: String },

        email:{

            type:String,
            required:true
        },
        address:{

            type:String,
            required:false
        },
        status:{

            type: String,
            enum: ["Pending", "Approved", "Failed"], 
            default: "Pending",
            required:false
        },
        txn_id:{
            type:String,
            required:false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        utr: {
            type: String,
            required: false,
        },
        adminAction : {
            type: String,
            required: false
        },
        reamrk : {
            type : String,
            required: false
        }
    }
);

module.exports = mongoose.model("PayOut", payOutSchema);