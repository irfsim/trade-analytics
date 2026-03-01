import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }
    const resend = new Resend(apiKey);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const message = formData.get('message') as string;
    const screenshot = formData.get('screenshot') as File | null;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let screenshotUrl: string | null = null;

    if (screenshot && screenshot.size > 0) {
      if (!screenshot.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Screenshot must be an image' }, { status: 400 });
      }
      if (screenshot.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Screenshot must be under 5MB' }, { status: 400 });
      }

      const ext = screenshot.name.split('.').pop() || 'png';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('feedback-screenshots')
        .upload(fileName, screenshot, {
          contentType: screenshot.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Screenshot upload failed:', uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from('feedback-screenshots')
          .getPublicUrl(fileName);
        screenshotUrl = urlData.publicUrl;
      }
    }

    const { error: emailError } = await resend.emails.send({
      from: 'OpenTrade <onboarding@resend.dev>',
      to: 'irfan.simons@gmail.com',
      subject: 'New Feedback from OpenTrade',
      html: buildFeedbackEmail({
        message: message.trim(),
        screenshotUrl,
        userEmail: user.email || 'Unknown',
        timestamp: new Date().toISOString(),
      }),
    });

    if (emailError) {
      console.error('Failed to send feedback email:', emailError);
      return NextResponse.json({ error: emailError.message || 'Failed to send feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending feedback:', error);
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildFeedbackEmail({
  message,
  screenshotUrl,
  userEmail,
  timestamp,
}: {
  message: string;
  screenshotUrl: string | null;
  userEmail: string;
  timestamp: string;
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="font-size: 18px; font-weight: 600; color: #18181b; margin: 0 0 16px 0;">
        New Feedback
      </h2>
      <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="font-size: 14px; color: #3f3f46; margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
      ${screenshotUrl ? `
        <div style="margin-bottom: 16px;">
          <p style="font-size: 12px; color: #71717a; margin: 0 0 8px 0;">Screenshot:</p>
          <a href="${screenshotUrl}" target="_blank">
            <img src="${screenshotUrl}" alt="Feedback screenshot" style="max-width: 100%; border-radius: 8px; border: 1px solid #e4e4e7;" />
          </a>
        </div>
      ` : ''}
      <div style="border-top: 1px solid #e4e4e7; padding-top: 12px; font-size: 12px; color: #a1a1aa;">
        <p style="margin: 0;">From: ${escapeHtml(userEmail)}</p>
        <p style="margin: 4px 0 0 0;">Sent: ${new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>
    </div>
  `;
}
