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

// ──────────────────────────────────────────
// Send Admin Reply Email
// ──────────────────────────────────────────
const sendReplyEmail = async (toEmail, customerName, originalSubject, replyMessage) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Githmi Sports Goods Team" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Re: ${originalSubject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                  background: #f8f6fb; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0;">Githmi Sports Goods</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${customerName}</strong>,</p>
          <div style="color: #4b5563; font-size: 15px; line-height: 1.6; white-space: pre-wrap; margin: 20px 0;">${replyMessage}</div>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #9ca3af; font-size: 13px; font-style: italic;">
            In response to your inquiry regarding:<br/>
            "${originalSubject}"
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ──────────────────────────────────────────
// Send Order Status Update Email
// ──────────────────────────────────────────
const sendOrderStatusEmail = async (toEmail, order) => {
  const transporter = createTransporter();

  const statusConfig = {
    Pending: {
      icon: "🕐",
      color: "#f59e0b",
      bgColor: "#fffbeb",
      badgeBg: "#fef3c7",
      badgeText: "#92400e",
      title: "Order is Pending",
      message: "Your order is in the queue and will be processed shortly. We'll notify you as soon as it moves forward.",
    },
    Processing: {
      icon: "⚙️",
      color: "#3b82f6",
      bgColor: "#eff6ff",
      badgeBg: "#dbeafe",
      badgeText: "#1e40af",
      title: "Order is Being Processed",
      message: "Great news! Our team is now actively processing your order. It will be on its way to you very soon.",
    },
    Delivered: {
      icon: "✅",
      color: "#22c55e",
      bgColor: "#f0fdf4",
      badgeBg: "#dcfce7",
      badgeText: "#166534",
      title: "Order Delivered!",
      message: "Your order has been delivered. We hope you love your purchase! If you have any issues, please contact us.",
    },
    Cancelled: {
      icon: "❌",
      color: "#ef4444",
      bgColor: "#fef2f2",
      badgeBg: "#fee2e2",
      badgeText: "#991b1b",
      title: "Order Cancelled",
      message: "Your order has been cancelled. If this was unexpected or you'd like to re-order, please visit our store or contact support.",
    },
  };

  const cfg = statusConfig[order.status] || statusConfig["Pending"];

  const itemsHTML = (order.billItems || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 8px; border-bottom:1px solid #f3f4f6; font-size:14px; color:#374151;">${item.productName}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #f3f4f6; text-align:center; font-size:14px; color:#374151;">${item.quantity}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #f3f4f6; text-align:right; font-size:14px; color:#374151;">
          LKR ${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `,
    )
    .join("");

  const mailOptions = {
    from: `"Githmi Sports Goods" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${cfg.icon} Order ${order.status} - #${order.orderId} | Githmi Sports Goods`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                  background: #f8f6fb; padding: 30px; border-radius: 16px;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0 0 4px;">Githmi Sports Goods</h1>
          <p style="color: #6b7280; font-size: 13px; margin: 0;">Order Status Update</p>
        </div>

        <!-- Status Card -->
        <div style="background: ${cfg.bgColor}; border: 2px solid ${cfg.color}; border-radius: 14px;
                    padding: 24px; text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px; margin-bottom: 10px;">${cfg.icon}</div>
          <span style="display: inline-block; background: ${cfg.badgeBg}; color: ${cfg.badgeText};
                       font-size: 13px; font-weight: bold; padding: 4px 14px; border-radius: 999px;
                       text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
            ${order.status}
          </span>
          <h2 style="color: ${cfg.color}; margin: 0 0 8px; font-size: 20px;">${cfg.title}</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">${cfg.message}</p>
        </div>

        <!-- Order Details -->
        <div style="background: white; border-radius: 14px; padding: 24px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px;">
          <p style="color: #374151; font-size: 15px; margin: 0 0 4px;">
            Hi <strong>${order.name}</strong>,
          </p>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 20px;">
            Order ID: <strong style="color:#4f46e5;">#${order.orderId}</strong>
          </p>

          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 8px; text-align:left; font-size:13px; color:#6b7280; font-weight:600;">Product</th>
                <th style="padding:10px 8px; text-align:center; font-size:13px; color:#6b7280; font-weight:600;">Qty</th>
                <th style="padding:10px 8px; text-align:right; font-size:13px; color:#6b7280; font-weight:600;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:12px 8px; font-weight:bold; font-size:14px; color:#111827;">Total</td>
                <td style="padding:12px 8px; font-weight:bold; text-align:right; font-size:15px; color:#4f46e5;">
                  LKR ${Number(order.total).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <hr style="border:0; border-top:1px solid #f3f4f6; margin:20px 0;" />

          <p style="color:#6b7280; font-size:13px; margin:0; line-height:1.6;">
            <strong>Delivery Address:</strong> ${order.address}<br/>
            <strong>Phone:</strong> ${order.phoneNumber}
          </p>
        </div>

        <!-- Footer -->
        <p style="text-align:center; color:#9ca3af; font-size:12px; margin:0;">
          © ${new Date().getFullYear()} Githmi Sports Goods. All rights reserved.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, sendOrderConfirmationEmail, sendReplyEmail, sendOrderStatusEmail };

