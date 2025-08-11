import { Button } from "@/components/button";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Link } from "@/components/link";
import { Text } from "@/components/text";
import React, { FormEvent, useState } from "react";
import { toast } from 'sonner';
import { useLanguage } from "../../context/LanguageContext";
import { forgotPassword } from "../../api/auth";

const ForgotPasswordPage: React.FC = () => {
  const { translate } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState({
    email: false
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({
    email: ""
  });

  const validateField = (name: string, value: string) => {
    let errorMessage = "";

    if (name === "email") {
      if (!value) {
        errorMessage = translate.auth('emailRequired');
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        errorMessage = "Please enter a valid email address";
      }
    }

    setValidationErrors(prev => ({
      ...prev,
      [name]: errorMessage
    }));

    return errorMessage === "";
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    if (name === "email") {
      validateField(name, email);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate email field
    const isEmailValid = validateField("email", email);

    // Mark field as touched
    setTouched({
      email: true
    });

    // Return if validation fails
    if (!isEmailValid) {
      return;
    }

    try {
      setIsLoading(true);

      await forgotPassword(email);
      
      setEmailSent(true);
      toast.success("Password reset instructions have been sent to your email");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send reset email";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="p-8">
        <div className="text-center mb-6">
          <Heading>{translate.layout('appName')}</Heading>
          <Text>{translate.layout('appDescription')}</Text>
        </div>
        
        <div className="text-center">
          <div className="mb-6">
            <Heading level={2} className="text-green-600">
              Check Your Email
            </Heading>
            <Text className="mt-4">
              We've sent password reset instructions to <strong>{email}</strong>
            </Text>
            <Text className="mt-2 text-sm text-gray-600">
              Didn't receive the email? Check your spam folder or try again.
            </Text>
          </div>
          
          <div className="space-y-4">
            <Button 
              onClick={() => {
                setEmailSent(false);
                setEmail("");
                setTouched({ email: false });
                setValidationErrors({ email: "" });
              }}
              outline
            >
              Try Different Email
            </Button>
            
            <div className="text-center">
              <Link href="/login">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="text-center mb-6">
        <Heading>{translate.layout('appName')}</Heading>
        <Text>{translate.layout('appDescription')}</Text>
      </div>

      <div className="mb-6">
        <Heading level={2}>
          Forgot Password
        </Heading>
        <Text className="mt-2">
          Enter your email address and we'll send you instructions to reset your password.
        </Text>
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
          <p className="text-red-500 text-sm mt-2">{validationErrors.email}</p>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Instructions"}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login">
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;