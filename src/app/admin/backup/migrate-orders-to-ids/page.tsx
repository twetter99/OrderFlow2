"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, Database, ArrowRight } from "lucide-react";
import { migrateOrdersToUseIds } from "./actions";

type MigrationResult = {
  success: boolean;
  message: string;
  details?: {
    total: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
};

export default function MigrateOrdersPage() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const handleMigration = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const migrationResult = await migrateOrdersToUseIds();
      setResult(migrationResult);
      
      if (migrationResult.success) {
        toast({
          title: "Migración completada",
          description: migrationResult.message,
          variant: "success",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error en migración",
          description: migrationResult.message,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setResult({
        success: false,
        message: errorMessage,
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migración de Órdenes de Compra
          </CardTitle>
          <CardDescription>
            Este script migra las órdenes de compra existentes para usar IDs en lugar de nombres
            para proyectos y proveedores, optimizando las consultas a Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Explanation */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">¿Qué hace esta migración?</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Busca órdenes donde <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">project</code> sea un nombre (no un ID)
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Añade el campo <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">projectName</code> si no existe
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Añade <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">supplierId</code> y <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">supplierName</code>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Convierte <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">project</code> de nombre a ID de documento
              </li>
            </ul>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Importante</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Este proceso es seguro y reversible. Las órdenes que ya tienen IDs correctos serán omitidas.
                  Se recomienda hacer un backup de la base de datos antes de ejecutar.
                </p>
              </div>
            </div>
          </div>

          {/* Run Button */}
          <Button
            onClick={handleMigration}
            disabled={isRunning}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando migración...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Ejecutar Migración
              </>
            )}
          </Button>

          {/* Results */}
          {result && (
            <div className={`p-4 rounded-lg ${
              result.success 
                ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" 
                : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
            }`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    result.success 
                      ? "text-green-800 dark:text-green-200" 
                      : "text-red-800 dark:text-red-200"
                  }`}>
                    {result.success ? "Migración exitosa" : "Error en migración"}
                  </h3>
                  <p className={`text-sm ${
                    result.success 
                      ? "text-green-700 dark:text-green-300" 
                      : "text-red-700 dark:text-red-300"
                  }`}>
                    {result.message}
                  </p>
                  
                  {result.details && (
                    <div className="mt-3 text-sm space-y-1">
                      <p><strong>Total procesadas:</strong> {result.details.total}</p>
                      <p><strong>Actualizadas:</strong> {result.details.updated}</p>
                      <p><strong>Omitidas (ya migradas):</strong> {result.details.skipped}</p>
                      {result.details.errors.length > 0 && (
                        <div>
                          <p className="font-semibold text-red-600">Errores:</p>
                          <ul className="list-disc list-inside">
                            {result.details.errors.slice(0, 5).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                            {result.details.errors.length > 5 && (
                              <li>... y {result.details.errors.length - 5} más</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
