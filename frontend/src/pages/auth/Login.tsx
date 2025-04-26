import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useLanguage } from "../../context/LanguageContext";
import PageLanguageSelector from "../../components/PageLanguageSelector";
import { toast } from 'sonner';
import { useAuthStore } from "../../store/authStore";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { translate } = useLanguage();
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

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {translate.auth('login')}
        </h2>
        <PageLanguageSelector />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={translate.auth('email')}
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={handleBlur}
          error={touched.email && validationErrors.email ? validationErrors.email : undefined}
        />

        <Input
          label={translate.auth('password')}
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={handleBlur}
          error={touched.password && validationErrors.password ? validationErrors.password : undefined}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
          >
            {translate.auth('login')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
