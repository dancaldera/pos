import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import PageLanguageSelector from "../../_components/PageLanguageSelector";
import { toast } from 'sonner';
import { useAuthStore } from "../../store/authStore";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { Heading } from "@/components/heading";
import { Select } from "@/components/select";
import { Language } from "@/i18n";
import LoadingPage from "@/_components/LoadingPage";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { translate } = useLanguage();
  const { language, setLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({
    email: "",
    password: ""
  });

  const validateField = (name: string, value: string) => {
    let errorMessage = "";

    if (name === "email") {
      if (!value) {
        errorMessage = translate.auth('emailRequired');
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        errorMessage = translate.common('error');
      }
    }

    if (name === "password" && !value) {
      errorMessage = translate.auth('passwordRequired');
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
    } else if (name === "password") {
      validateField(name, password);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const isEmailValid = validateField("email", email);
    const isPasswordValid = validateField("password", password);

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true
    });

    // Return if any validation fails
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      setIsLoading(true);

      // Call login function that now returns result object
      const result = await login({ email, password });

      if (result.success) {
        toast.success(translate.auth('welcome'));
        navigate("/");
      } else {
        toast.error(result.error || translate.auth('loginFailed'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : translate.auth('loginFailed');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Loading...</h2>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <Heading level={2}>
          {translate.auth('login')}
        </Heading>
        <div className="w-32">
          <Select
            id="language"
            name="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </Select>
        </div>
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

        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={handleBlur}
        />

        {touched.password && validationErrors.password && (
          <p className="text-red-500 text-sm mt-2">{validationErrors.password}</p>
        )}

        <div className="pt-2">
          <Button
            type="submit"
          >
            {translate.auth('login')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
