

"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange: (value: string) => void;
  isOptional?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, onValueChange, value, isOptional, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <TooltipProvider>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            ref={ref}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={isOptional ? "Dejar en blanco para no cambiar" : "••••••"}
            className="pr-10"
            {...props}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            <Tooltip>
                 <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{showPassword ? 'Ocultar' : 'Mostrar'} contraseña</p>
                </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
