"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { PasswordInput } from '../shared/password-input';

const formSchema = z.object({
  email: z.string().email("Por favor, introduce un correo electrónico válido."),
  password: z.string().min(1, "La contraseña no puede estar vacía."),
});

type LoginFormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const { signInWithEmail, sendPasswordReset, loading } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginFormValues) => {
    signInWithEmail(values.email, values.password);
  };
  
  const handleForgotPassword = () => {
    const email = form.getValues("email");
    if (!email) {
        form.setError("email", { type: "manual", message: "Introduce tu email para restablecer la contraseña." });
        return;
    }
    sendPasswordReset(email);
  };

  return (
    <Card className="bg-transparent border-none shadow-none">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pt-6 p-0">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input 
                        placeholder="tu@email.com" 
                        {...field}
                        className="bg-white/20 border-gray-300/30 focus:ring-white/80 text-white placeholder:text-gray-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-white/80">Contraseña</FormLabel>
                    <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto font-normal text-xs text-gray-400 hover:text-white"
                        onClick={handleForgotPassword}
                    >
                      ¿Has olvidado tu contraseña?
                    </Button>
                  </div>
                  <FormControl>
                    <PasswordInput 
                      {...field}
                      onValueChange={field.onChange}
                      placeholder="••••••••"
                      className="bg-white/20 border-gray-300/30 focus:ring-white/80 text-white placeholder:text-gray-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col gap-4 p-0 pt-6">
            <Button 
                type="submit" 
                className="w-full bg-white text-black rounded-lg hover:bg-gray-200" 
                disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Verificando..." : "Acceder"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
