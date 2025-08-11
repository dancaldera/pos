import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Link } from '@/components/link'
import { Text } from '@/components/text'
import React, { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { forgotPassword } from '../../api/auth'
import { useLanguage } from '../../context/LanguageContext'

const ForgotPasswordPage: React.FC = () => {
  const { translate } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState({
    email: false,
  })

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({
    email: '',
  })

  const validateField = (name: string, value: string) => {
    let errorMessage = ''

    if (name === 'email') {
      if (!value) {
        errorMessage = translate.auth('emailRequired')
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        errorMessage = translate.auth('invalidEmailFormat')
      }
    }

    setValidationErrors((prev) => ({
      ...prev,
      [name]: errorMessage,
    }))

    return errorMessage === ''
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))

    if (name === 'email') {
      validateField(name, email)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validate email field
    const isEmailValid = validateField('email', email)

    // Mark field as touched
    setTouched({
      email: true,
    })

    // Return if validation fails
    if (!isEmailValid) {
      return
    }

    try {
      setIsLoading(true)

      await forgotPassword(email)

      setEmailSent(true)
      toast.success(translate.auth('resetEmailSentSuccess'))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : translate.auth('resetEmailSentFailed')
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="p-8">
        <div className="mb-6 text-center">
          <Heading>{translate.layout('appName')}</Heading>
          <Text>{translate.layout('appDescription')}</Text>
        </div>

        <div className="text-center">
          <div className="mb-6">
            <Heading level={2} className="text-green-600">
              {translate.auth('checkYourEmail')}
            </Heading>
            <Text className="mt-4">
              {translate.auth('emailSentMessage')} <strong>{email}</strong>
            </Text>
            <Text className="mt-2 text-sm text-gray-600">{translate.auth('emailNotReceived')}</Text>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => {
                setEmailSent(false)
                setEmail('')
                setTouched({ email: false })
                setValidationErrors({ email: '' })
              }}
              outline
            >
              {translate.auth('tryDifferentEmail')}
            </Button>

            <div className="text-center">
              <Link href="/login">{translate.auth('backToLogin')}</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 text-center">
        <Heading>{translate.layout('appName')}</Heading>
        <Text>{translate.layout('appDescription')}</Text>
      </div>

      <div className="mb-6">
        <Heading level={2}>{translate.auth('forgotPasswordTitle')}</Heading>
        <Text className="mt-2">{translate.auth('forgotPasswordDescription')}</Text>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={handleBlur}
        />

        {touched.email && validationErrors.email && (
          <p className="mt-2 text-sm text-red-500">{validationErrors.email}</p>
        )}

        <div className="pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? translate.auth('sending') : translate.auth('sendResetInstructions')}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <Text>
          <Link href="/login" className="text-blue-600 hover:text-blue-500">
            {translate.auth('backToLogin')}
          </Link>
        </Text>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
