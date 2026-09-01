import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import BrandMark from "@/components/shared/brand-mark";

export const metadata: Metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3 text-center">
          <BrandMark withWordmark className="mx-auto" />
          <div className="space-y-1">
            <CardTitle className="text-xl">С возвращением</CardTitle>
            <CardDescription>Войдите в свой Life OS</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
