interface AuthCodeEmailProps {
  userName: string;
  authCode: string;
  expiresInMinutes?: number;
  userEmail: string;
}

export function AuthCodeEmailTemplate({ 
  userName, 
  authCode, 
  expiresInMinutes = 10,
  userEmail 
}: AuthCodeEmailProps) {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      lineHeight: '1.6',
      color: '#374151',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'linear-gradient(135deg, #00D4AA 0%, #fbbf24 50%, #22d3ee 100%)',
        background: 'linear-gradient(135deg, #00D4AA 0%, #fbbf24 50%, #22d3ee 100%)',
        padding: '40px 20px',
        textAlign: 'center',
        borderRadius: '12px 12px 0 0'
      }}>
        {/* Logo */}
        <div style={{
          display: 'inline-block',
          width: '48px',
          height: '48px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          marginBottom: '16px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px'
          }}>
            ✨
          </div>
        </div>
        
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '28px',
          fontWeight: '600',
          color: '#ffffff'
        }}>
          N8N Bazar
        </h1>
        
        <p style={{
          margin: '0',
          fontSize: '16px',
          color: 'rgba(255, 255, 255, 0.9)'
        }}>
          Your magical automation platform
        </p>
      </div>

      {/* Main Content */}
      <div style={{
        padding: '40px 30px',
        backgroundColor: '#ffffff'
      }}>
        <h2 style={{
          margin: '0 0 24px 0',
          fontSize: '24px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Welcome back, {userName}! ✨
        </h2>

        <p style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          color: '#4b5563',
          lineHeight: '1.6'
        }}>
          We received a request to sign in to your N8N Bazar account. Use the verification code below to complete your magical journey:
        </p>

        {/* Auth Code Box */}
        <div style={{
          backgroundColor: '#f0fdfa',
          border: '2px solid #00D4AA',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          margin: '32px 0'
        }}>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: '500',
            color: '#059669',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Your Verification Code
          </p>
          
          <div style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#00D4AA',
            letterSpacing: '8px',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            margin: '0 0 16px 0'
          }}>
            {authCode}
          </div>
          
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            This code expires in <strong>{expiresInMinutes} minutes</strong>
          </p>
        </div>

        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          margin: '24px 0'
        }}>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#92400e'
          }}>
            🔒 Security Notice
          </p>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#92400e',
            lineHeight: '1.5'
          }}>
            If you didn't request this code, please ignore this email. Never share your verification code with anyone.
          </p>
        </div>

        <p style={{
          margin: '32px 0 0 0',
          fontSize: '16px',
          color: '#4b5563'
        }}>
          Ready to create some magical workflows? We can't wait to see what you'll automate next!
        </p>

        <div style={{
          textAlign: 'center',
          margin: '40px 0'
        }}>
          <a href="https://n8nbazar.com/login" style={{
            display: 'inline-block',
            backgroundColor: '#00D4AA',
            color: '#ffffff',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            Continue to N8N Bazar →
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: '32px 30px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <p style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          This email was sent to <strong>{userEmail}</strong>
        </p>
        
        <div style={{
          fontSize: '12px',
          color: '#9ca3af',
          lineHeight: '1.5'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            N8N Bazar - Magical Automation Platform
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            © 2024 N8N Bazar. All rights reserved.
          </p>
          <p style={{ margin: '0' }}>
            <a href="#" style={{ color: '#00D4AA', textDecoration: 'none' }}>Unsubscribe</a> | 
            <a href="#" style={{ color: '#00D4AA', textDecoration: 'none', marginLeft: '8px' }}>Privacy Policy</a> | 
            <a href="#" style={{ color: '#00D4AA', textDecoration: 'none', marginLeft: '8px' }}>Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Function to generate HTML string for email services
export function generateAuthCodeEmailHTML(props: AuthCodeEmailProps): string {
  const { userName, authCode, expiresInMinutes = 10, userEmail } = props;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your N8N Bazar Verification Code</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 20px; background-color: #f3f4f6;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; background-color: #ffffff">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #00D4AA 0%, #fbbf24 50%, #22d3ee 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0">
      <!-- Logo -->
      <div style="display: inline-block; width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 16px; position: relative">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px">✨</div>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 600; color: #ffffff">N8N Bazar</h1>
      <p style="margin: 0; font-size: 16px; color: rgba(255, 255, 255, 0.9)">Your magical automation platform</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px; background-color: #ffffff">
      <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1f2937">Welcome back, ${userName}! ✨</h2>
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6">We received a request to sign in to your N8N Bazar account. Use the verification code below to complete your magical journey:</p>

      <!-- Auth Code Box -->
      <div style="background-color: #f0fdfa; border: 2px solid #00D4AA; border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0">
        <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 500; color: #059669; text-transform: uppercase; letter-spacing: 0.5px">Your Verification Code</p>
        <div style="font-size: 36px; font-weight: 700; color: #00D4AA; letter-spacing: 8px; font-family: Monaco, Consolas, 'Courier New', monospace; margin: 0 0 16px 0">${authCode}</div>
        <p style="margin: 0; font-size: 14px; color: #6b7280">This code expires in <strong>${expiresInMinutes} minutes</strong></p>
      </div>

      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e">🔒 Security Notice</p>
        <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5">If you didn't request this code, please ignore this email. Never share your verification code with anyone.</p>
      </div>

      <p style="margin: 32px 0 0 0; font-size: 16px; color: #4b5563">Ready to create some magical workflows? We can't wait to see what you'll automate next!</p>

      <div style="text-align: center; margin: 40px 0">
        <a href="https://n8nbazar.com/login" style="display: inline-block; background-color: #00D4AA; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600">Continue to N8N Bazar →</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 32px 30px; border-top: 1px solid #e5e7eb; text-align: center">
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280">This email was sent to <strong>${userEmail}</strong></p>
      <div style="font-size: 12px; color: #9ca3af; line-height: 1.5">
        <p style="margin: 0 0 8px 0">N8N Bazar - Magical Automation Platform</p>
        <p style="margin: 0 0 8px 0">© 2024 N8N Bazar. All rights reserved.</p>
        <p style="margin: 0">
          <a href="#" style="color: #00D4AA; text-decoration: none">Unsubscribe</a> | 
          <a href="#" style="color: #00D4AA; text-decoration: none; margin-left: 8px">Privacy Policy</a> | 
          <a href="#" style="color: #00D4AA; text-decoration: none; margin-left: 8px">Support</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}