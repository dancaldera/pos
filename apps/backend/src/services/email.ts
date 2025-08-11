import nodemailer from 'nodemailer'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    })
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }

      await this.transporter.sendMail(mailOptions)
      logger.info(`Email sent successfully to ${options.to}`)
    } catch (error) {
      logger.error('Failed to send email:', error)
      throw new Error('Failed to send email')
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${resetToken}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You have requested to reset your password. Click the link below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you did not request this password reset, please ignore this email.
        </p>
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, you can copy and paste this URL into your browser:
          <br><br>
          <code style="background-color: #f5f5f5; padding: 4px; border-radius: 4px;">${resetUrl}</code>
        </p>
      </div>
    `

    const text = `
You have requested to reset your password. 

Please visit the following link to reset your password:
${resetUrl}

This link will expire in 1 hour. If you did not request this password reset, please ignore this email.
    `

    await this.sendEmail({
      to,
      subject: 'Password Reset Request',
      text,
      html,
    })
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      logger.info('Email service connection verified successfully')
      return true
    } catch (error) {
      logger.error('Email service connection failed:', error)
      return false
    }
  }
}

export const emailService = new EmailService()
