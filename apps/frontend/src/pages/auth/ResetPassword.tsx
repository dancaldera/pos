import type React from 'react'
import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Link } from '@/components/link'
import { Text } from '@/components/text'
import { resetPassword } from '../../api/auth'
import { useLanguage } from '../../context/LanguageContext'

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { translate } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const token = searchParams.get('token')

  // Form state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  })

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!token) {
      toast.error(translate.auth('invalidResetToken'))
      navigate('/login')
    }
  }, [token, navigate, translate.auth])

  const validateField = (name: string, value: string) => {
    let errorMessage = ''

    if (name === 'password') {
      if (!value) {
        errorMessage = translate.auth('passwordRequired')
      } else if (value.length < 6) {
        errorMessage = translate.auth('passwordMinLength')
      }
    }

    if (name === 'confirmPassword') {
      if (!value) {
        errorMessage = translate.auth('confirmPasswordRequired')
      } else if (value !== password) {
        errorMessage = translate.auth('passwordsDoNotMatch')
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

    if (name === 'password') {
      validateField(name, password)
      // Also revalidate confirm password if it was already touched
      if (touched.confirmPassword) {
        validateField('confirmPassword', confirmPassword)
      }
    } else if (name === 'confirmPassword') {
      validateField(name, confirmPassword)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error(translate.auth('invalidResetToken'))
      return
    }

    // Validate all fields
    const isPasswordValid = validateField('password', password)
    const isConfirmPasswordValid = validateField('confirmPassword', confirmPassword)

    // Mark all fields as touched
    setTouched({
      password: true,
      confirmPassword: true,
    })

    // Return if any validation fails
    if (!isPasswordValid || !isConfirmPasswordValid) {
      return
    }

    try {
      setIsLoading(true)

      await resetPassword(token, password)

      setResetSuccess(true)
      toast.success(translate.auth('passwordResetSuccessMessage'))
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : translate.auth('resetPasswordFailed')
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (resetSuccess) {
    return (
      <div className="p-8">
        <div className="mb-6 text-center">
          <Heading>{translate.layout('appName')}</Heading>
          <Text>{translate.layout('appDescription')}</Text>
        </div>

        <div className="text-center">
          <div className="mb-6">
            <Heading level={2} className="text-green-600">
              {translate.auth('passwordResetSuccessTitle')}
            </Heading>
            <Text className="mt-4">{translate.auth('passwordResetSuccessMessage')}</Text>
          </div>

          <Button onClick={() => navigate('/login')}>{translate.auth('goToLogin')}</Button>
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
        <Heading level={2}>{translate.auth('resetPasswordTitle')}</Heading>
        <Text className="mt-2">{translate.auth('resetPasswordDescription')}</Text>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={translate.auth('newPassword')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={handleBlur}
        />

        {touched.password && validationErrors.password && (
          <p className="mt-2 text-sm text-red-500">{validationErrors.password}</p>
        )}

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder={translate.auth('confirmNewPassword')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={handleBlur}
        />

        {touched.confirmPassword && validationErrors.confirmPassword && (
          <p className="mt-2 text-sm text-red-500">{validationErrors.confirmPassword}</p>
        )}

        <div className="pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? translate.auth('resetting') : translate.auth('resetPassword')}
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

export default ResetPasswordPage
