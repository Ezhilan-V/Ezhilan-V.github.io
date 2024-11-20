// project-card.interface.ts
export interface ProjectCard {
    id: string;
    title: string;
    role: string;
    timeline: string;
    description: string;
    technologies: string[];
    images: string[];
    videoUrl?: string;
    githubUrl?: string;
    demoUrl?: string;
    highlights: string[];
    category: 'robotics' | 'software' | 'research';
  }
  