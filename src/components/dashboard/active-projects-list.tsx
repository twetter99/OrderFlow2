
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Project } from "@/lib/types";

export function ActiveProjectsList({ projects }: { projects: Project[] }) {
  const activeProjects = projects.filter(p => p.status === 'En Progreso');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Proyectos Activos</CardTitle>
        <CardDescription>
          Un resumen de los proyectos actualmente en marcha.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeProjects.map((project) => {
          const progress = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
          return (
            <div key={project.id}>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium">{project.name}</p>
                <p className="text-sm text-muted-foreground">{progress}%</p>
              </div>
              <Progress value={progress} aria-label={`${project.name} progress`} />
            </div>
          )
        })}
         {activeProjects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
                No hay proyectos activos en este momento.
            </p>
         )}
      </CardContent>
    </Card>
  )
}
