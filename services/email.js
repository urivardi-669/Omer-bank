const sgMail = require('@sendgrid/mail');

async function sendApprovalRequest(token, tx) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const approvalUrl = `${process.env.BASE_URL}/api/approve/${token}`;
  const typeHebrew = tx.type === 'credit' ? 'זכות' : 'חובה';
  const amountFormatted = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
  }).format(tx.amount);

  const htmlBody = `
    <div dir="rtl" style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
      <h2 style="color: #2c5f8a;">עומר מבקש להזין תנועה חדשה</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>שם התנועה:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${tx.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>סוג:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${typeHebrew}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>סכום:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${amountFormatted}</td>
        </tr>
      </table>
      <br/>
      <a href="${approvalUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #28a745;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: bold;
      ">✓ אישור התנועה</a>
      <br/><br/>
      <p style="color: #888; font-size: 13px;">הקישור בתוקף ל-72 שעות.</p>
      <p style="color: #888; font-size: 12px;">אם לא ניתן ללחוץ על הכפתור, העתק את הקישור הבא:<br/>${approvalUrl}</p>
    </div>
  `;

  const textBody = `עומר מבקש להזין תנועה חדשה\n\nשם התנועה: ${tx.name}\nסוג: ${typeHebrew}\nסכום: ${amountFormatted}\n\nלאישור התנועה לחץ כאן:\n${approvalUrl}\n\nהקישור בתוקף ל-72 שעות.`;

  const msg = {
    to: ['uri.vardi@gmail.com', 'irit.neumann@gmail.com'],
    from: process.env.SENDGRID_FROM || process.env.SMTP_USER,
    subject: 'עומר מבקש להזין תנועה חדשה — אישור נדרש',
    text: textBody,
    html: htmlBody,
  };

  await sgMail.send(msg);
}

module.exports = { sendApprovalRequest };
