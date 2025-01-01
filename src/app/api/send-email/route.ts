import sgMail from '@sendgrid/mail';
import { NextResponse } from 'next/server';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

    // Construct the email message
    const msg = {
      to: 'devreddy923@gmail.com', // Change to your recipient email
      from: 'medirate.net@gmail.com', // Verified sender email
      subject: `New Contact Us Message from ${name || 'Unknown'}`,
      text: `You have received a new message from ${name || 'Unknown'} (${email || 'No email provided'}):\n\n${message || 'No message provided.'}`,
      html: `
        <h3>New Contact Us Message</h3>
        <p><strong>Name:</strong> ${name || 'Unknown'}</p>
        <p><strong>Email:</strong> ${email || 'No email provided'}</p>
        <p><strong>Message:</strong></p>
        <p>${message || 'No message provided.'}</p>
      `,
    };

    // Send the email using SendGrid
    await sgMail.send(msg);

    return NextResponse.json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.error('Error sending email:', error.response?.body || error);

    // Check for specific SendGrid errors
    return NextResponse.json(
      { success: false, error: 'Failed to send email.' },
      { status: 500 }
    );
  }
}
