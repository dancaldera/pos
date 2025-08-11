import { Button } from "@/components/button";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Link } from "@/components/link";
import { Text } from "@/components/text";
import React, { FormEvent, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from 'sonner';
import { useLanguage } from "../../context/LanguageContext";
import { resetPassword } from "../../api/auth";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { translate } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const token = searchParams.get('token');

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token");
      navigate("/login");
    }
  }, [token, navigate]);

  const validateField = (name: string, value: string) => {
    let errorMessage = "";

    if (name === "password") {
      if (!value) {
        errorMessage = translate.auth('passwordRequired');
      } else if (value.length < 6) {
        errorMessage = "Password must be at least 6 characters long";
      }
    }

    if (name === "confirmPassword") {
      if (!value) {
        errorMessage = "Please confirm your password";
      } else if (value !== password) {
        errorMessage = "Passwords do not match";
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

    if (name === "password") {
      validateField(name, password);
      // Also revalidate confirm password if it was already touched
      if (touched.confirmPassword) {
        validateField("confirmPassword", confirmPassword);
      }
    } else if (name === "confirmPassword") {
      validateField(name, confirmPassword);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }

    // Validate all fields
    const isPasswordValid = validateField("password", password);
    const isConfirmPasswordValid = validateField("confirmPassword", confirmPassword);

    // Mark all fields as touched
    setTouched({
      password: true,
      confirmPassword: true
    });

    // Return if any validation fails
    if (!isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    try {
      setIsLoading(true);

      await resetPassword(token, password);
      
      setResetSuccess(true);
      toast.success("Password has been reset successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reset password";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="p-8">
        <div className="text-center mb-6">
          <Heading>{translate.layout('appName')}</Heading>
          <Text>{translate.layout('appDescription')}</Text>
        </div>
        
        <div className="text-center">
          <div className="mb-6">
            <Heading level={2} className="text-green-600">
              Password Reset Successful
            </Heading>
            <Text className="mt-4">
              Your password has been reset successfully. You can now log in with your new password.
            </Text>
          </div>
          
          <Button onClick={() => navigate("/login")}>
            Go to Login
          </Button>
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
          Reset Your Password
        </Heading>
        <Text className="mt-2">
          Enter your new password below.
        </Text>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={handleBlur}
        />

        {touched.password && validationErrors.password && (
          <p className="text-red-500 text-sm mt-2">{validationErrors.password}</p>
        )}

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={handleBlur}
        />

        {touched.confirmPassword && validationErrors.confirmPassword && (
          <p className="text-red-500 text-sm mt-2">{validationErrors.confirmPassword}</p>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
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

export default ResetPasswordPage;