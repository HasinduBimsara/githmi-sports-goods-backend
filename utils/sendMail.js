const nodemailer = require("nodemailer");

// ──────────────────────────────────────────
// Create reusable transporter
// ──────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (NOT your Gmail password)
    },
  });
};

// ──────────────────────────────────────────
// Send OTP Email
// ──────────────────────────────────────────
const sendOTPEmail = async (toEmail, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Githmi Sports Goods" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset OTP - Githmi Sports Goods",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; 
                  background: #f8f6fb; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; font-size: 28px; margin: 0;">Githmi Sports Goods</h1>
          <p style="color: #6b7280; font-size: 14px;">Password Reset Request</p>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 30px; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <p style="color: #374151; font-size: 16px;">Hi there,</p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            We received a request to reset your password. Use the OTP below to proceed.
            This OTP is valid for <strong>10 minutes</strong>.
          </p>
          
          <div style="text-align: center; margin: 28px 0;">
            <div style="background: linear-gradient(135deg, #4f46e5, #a855f7);
                        color: white; font-size: 36px; font-weight: bold;
                        letter-spacing: 12px; padding: 20px 30px;
                        border-radius: 12px; display: inline-block;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #9ca3af; font-size: 13px;">
            If you did not request a password reset, please ignore this email.
            Your account remains secure.
          </p>
        </div>
        
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          © ${new Date().getFullYear()} Githmi Sports Goods. All rights reserved.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ──────────────────────────────────────────
// Send Order Confirmation Email
// ──────────────────────────────────────────
const sendOrderConfirmationEmail = async (toEmail, order) => {
  const transporter = createTransporter();

  const itemsHTML = order.billItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">
          LKR ${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `,
    )
    .join("");

  const mailOptions = {
    from: `"Githmi Sports Goods" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Order Confirmed - ${order.orderId} | Githmi Sports Goods`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                  background: #f8f6fb; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5;">Githmi Sports Goods</h1>
          <p style="color: #22c55e; font-size: 18px; font-weight: bold;">
            ✅ Order Confirmed!
          </p>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 24px;">
          <p>Hi <strong>${order.name}</strong>,</p>
          <p>Your order <strong>#${order.orderId}</strong> has been placed successfully.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: left;">Product</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px; font-weight: bold;">Total</td>
                <td style="padding: 12px; font-weight: bold; text-align: right; color: #4f46e5;">
                  LKR ${order.total.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Delivery Address:</strong> ${order.address}<br/>
            <strong>Phone:</strong> ${order.phoneNumber}
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, sendOrderConfirmationEmail };
