import { useFormik } from "formik";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import PageLanguageSelector from "../../components/PageLanguageSelector";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { translate } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email(translate.common('error'))
        .required(translate.auth('emailRequired')),
      password: Yup.string().required(translate.auth('passwordRequired')),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      setError(null);
      try {
        await login(values);
        navigate("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to login");
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {translate.auth('login')}
        </h2>
        <PageLanguageSelector />
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={formik.handleSubmit} className="space-y-4">
        <Input
          label={translate.auth('email')}
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          fullWidth
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={
            formik.touched.email && formik.errors.email
              ? formik.errors.email
              : undefined
          }
        />

        <Input
          label={translate.auth('password')}
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          fullWidth
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={
            formik.touched.password && formik.errors.password
              ? formik.errors.password
              : undefined
          }
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
