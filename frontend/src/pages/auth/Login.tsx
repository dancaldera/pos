import { useFormik } from "formik";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      password: Yup.string().required("Password is required"),
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
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Login
      </h2>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={formik.handleSubmit} className="space-y-4">
        <Input
          label="Email"
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
          label="Password"
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
            Login
          </Button>
        </div>
      </form>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-600 text-center">
          <p>Demo credentials:</p>
          <p className="font-medium">Email: admin@example.com</p>
          <p className="font-medium">Password: admin123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
