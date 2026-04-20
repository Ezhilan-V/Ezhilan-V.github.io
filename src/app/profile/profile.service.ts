import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

export interface PortfolioMeta {
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
  resumeUrl: string;
  copyrightYear: string;
  languages: string;
  patent: string;
}

export interface PortfolioStat {
  label: string;
  suffix: string;
  target: number;
  colorClass: string;
  decimal?: number;
}

export interface PortfolioHero {
  roles: string[];
  techTags: string[];
  stats: PortfolioStat[];
}

export interface PortfolioAbout {
  bio: string;
  professionalSummary: string[];
}

export interface SkillCategory {
  name: string;
  icon: string;
  color: string;
  skills: string[];
}

export interface SubProject {
  id: string;
  name: string;
  role: string;
  description: string;
  technologies: string[];
  responsibilities: string[];
}

export interface Experience {
  id: string;
  company: string;
  location: string;
  role: string;
  period: string;
  color: string;
  responsibilities: string[];
  subProjects?: SubProject[];
}

export interface CourseCategory {
  category: string;
  courses: string[];
}

export type EducationSection =
  | { type: 'gpa'; content: string }
  | { type: 'courseCategorized'; title: string; content: CourseCategory[] }
  | { type: 'projects'; content: string[] }
  | { type: 'achievements'; content: string[] };

export interface Education {
  school: string;
  period: string;
  degree: string;
  gradient: string;
  details: EducationSection[];
}

export interface Project {
  title: string;
  role: string;
  timeline: string;
  description: string;
  imageUrls: string[];
  technologies?: string[];
  highlights?: string[];
}

export interface ProjectCategory {
  name: string;
  icon: string;
  projects: Project[];
}

export interface MotorsportRole {
  role: string;
  team: string;
  year: string;
  highlights: string[];
  color: string;
  borderColor: string;
}

export interface Motorsport {
  summary: string;
  roles: MotorsportRole[];
  tags: string[];
}

export interface Patent {
  title: string;
  applicationNumber: string;
  filingDate: string;
  applicant: string;
  description: string;
  impact: string;
}

export interface StarStory {
  id: string;
  title: string;
  principle: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  stub?: boolean;
}

export interface PortfolioData {
  meta: PortfolioMeta;
  hero: PortfolioHero;
  about: PortfolioAbout;
  skills: SkillCategory[];
  experience: Experience[];
  education: Education[];
  projects: ProjectCategory[];
  motorsport: Motorsport;
  patent: Patent;
  stories: StarStory[];
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  selectedSkill$ = new BehaviorSubject<string | null>(null);

  private portfolioData!: PortfolioData;

  constructor(private http: HttpClient) {}

  load() {
    return this.http.get<PortfolioData>('assets/data/portfolio.json').pipe(
      tap(data => this.portfolioData = data),
      catchError(err => {
        console.error('Failed to load portfolio.json:', err);
        return of(null);
      })
    );
  }

  get meta(): PortfolioMeta       { return this.portfolioData.meta; }
  get hero(): PortfolioHero       { return this.portfolioData.hero; }
  get about(): string             { return this.portfolioData.about.bio; }
  get professionalSummary(): string[] { return this.portfolioData.about.professionalSummary; }
  get skills(): SkillCategory[]   { return this.portfolioData.skills; }
  get experience(): Experience[]  { return this.portfolioData.experience; }
  get education(): Education[]    { return this.portfolioData.education; }
  get projects(): ProjectCategory[] { return this.portfolioData.projects; }
  get motorsport(): Motorsport    { return this.portfolioData.motorsport; }
  get patent(): Patent            { return this.portfolioData.patent; }
  get stories(): StarStory[]      { return this.portfolioData.stories; }

  setSkillFilter(skill: string | null) { this.selectedSkill$.next(skill); }
}
