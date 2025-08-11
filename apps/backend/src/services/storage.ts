import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import fs from 'fs'
import path from 'path'

// Create an S3 client
let s3Client: S3Client | null = null

// Initialize the S3 client if S3 configuration is available
if (
  config.storage.s3.endpoint &&
  config.storage.s3.region &&
  config.storage.s3.accessKeyId &&
  config.storage.s3.secretAccessKey &&
  config.storage.s3.bucketName
) {
  s3Client = new S3Client({
    endpoint: config.storage.s3.endpoint,
    region: config.storage.s3.region,
    credentials: {
      accessKeyId: config.storage.s3.accessKeyId,
      secretAccessKey: config.storage.s3.secretAccessKey,
    },
  })
  logger.info('S3 client initialized')
} else {
  logger.warn('S3 configuration not provided, file uploads will be saved locally')
}

// Function to upload a file to S3 or local filesystem
export const uploadFile = async (
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<string> => {
  // Generate a unique file name
  const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`

  // If S3 client is initialized, upload to S3
  if (s3Client && config.storage.s3.bucketName) {
    try {
      const key = `${folder}/${fileName}`

      // Upload file to S3
      const command = new PutObjectCommand({
        Bucket: config.storage.s3.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })

      await s3Client.send(command)

      // Generate a pre-signed URL for the uploaded object
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 * 24 * 7 }) // URL valid for 7 days

      logger.info(`File uploaded to S3: ${key}`)
      return url
    } catch (error) {
      logger.error('Error uploading file to S3', error)
      throw new Error('Failed to upload file to S3')
    }
  } else {
    // Save file locally if S3 is not configured
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', folder)
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      // Write file to disk
      const filePath = path.join(uploadsDir, fileName)
      fs.writeFileSync(filePath, file.buffer)

      logger.info(`File saved locally: ${filePath}`)

      // Return a relative URL for the file
      return `/uploads/${folder}/${fileName}`
    } catch (error) {
      logger.error('Error saving file locally', error)
      throw new Error('Failed to save file locally')
    }
  }
}

// Function to delete a file from S3 or local filesystem
export const deleteFile = async (fileUrl: string): Promise<void> => {
  if (!fileUrl) return

  // If S3 client is initialized, delete from S3
  if (
    s3Client &&
    config.storage.s3.bucketName &&
    fileUrl.includes(config.storage.s3.endpoint || '')
  ) {
    try {
      // Extract the key from the URL
      const key = new URL(fileUrl).pathname.substring(1)

      // Delete file from S3
      const command = new DeleteObjectCommand({
        Bucket: config.storage.s3.bucketName,
        Key: key,
      })

      await s3Client.send(command)
      logger.info(`File deleted from S3: ${key}`)
    } catch (error) {
      logger.error('Error deleting file from S3', error)
      throw new Error('Failed to delete file from S3')
    }
  } else if (fileUrl.startsWith('/uploads/')) {
    // Delete file locally if it's a local file
    try {
      const filePath = path.join(process.cwd(), fileUrl)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        logger.info(`File deleted locally: ${filePath}`)
      }
    } catch (error) {
      logger.error('Error deleting file locally', error)
      throw new Error('Failed to delete file locally')
    }
  }
}
