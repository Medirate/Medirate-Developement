import sgMail from '@sendgrid/mail';
import { NextResponse } from 'next/server';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, company, title, email, message } = body;

    // Ensure all fields are filled
    if (!firstName || !lastName || !company || !title || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const msg = {
      to: 'devreddy923@gmail.com',
      from: 'medirate.net@gmail.com',
      subject: `Message from ${firstName} ${lastName}`,
      text: message,
      html: `<p>${message}</p>`,
    };

    await sgMail.send(msg);

    return NextResponse.json({ success: true, message: 'Email sent successfully.' });
  } catch (error: any) {
    if (error.response) {
      // Handle SendGrid-specific errors
      console.error('Error sending email:', error.response.body || error.message);
    } else {
      console.error('Unexpected error:', error);
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send email.' },
      { status: 500 }
    );
  }
}
