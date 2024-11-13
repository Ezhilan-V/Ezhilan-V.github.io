// education.component.ts
import { Component } from '@angular/core';

interface CourseCategory {
  category: string;
  courses: string[];
}

interface BaseEducationSection {
  type: 'gpa' | 'courseCategorized' | 'projects' | 'achievements';
  title?: string;
}

interface GPASection extends BaseEducationSection {
  type: 'gpa';
  content: string;
}

interface CourseCategorizedSection extends BaseEducationSection {
  type: 'courseCategorized';
  title: string;
  content: CourseCategory[];
}

interface ProjectsSection extends BaseEducationSection {
  type: 'projects';
  content: string[];
}

interface AchievementsSection extends BaseEducationSection {
  type: 'achievements';
  content: string[];
}

type EducationSection = GPASection | CourseCategorizedSection | ProjectsSection | AchievementsSection;

interface Education {
  school: string;
  period: string;
  degree: string;
  details: EducationSection[];
}

@Component({
  selector: 'app-education',
  templateUrl: './education.component.html',
  styleUrls: ['./education.component.scss']
})
export class EducationComponent {
  education: Education[] = [
    {
      school: 'Arizona State University',
      period: '2022 - 2024',
      degree: 'Master of Science in Robotics and Autonomous Systems (Mechanical and Aerospace Engineering)',
      details: [
        {
          type: 'gpa',
          content: 'Graduated With Distinction with a perfect <b>4.0 CGPA</b>'
        } as GPASection,
        {
          type: 'courseCategorized',
          title: 'Specialized Coursework',
          content: [
            {
              category: 'Advanced Robotics',
              courses: ['Robotic Systems II', 'Modeling and Control of Robots', 'Multi-Robot Systems']
            },
            {
              category: 'AI & Perception',
              courses: ['Machine Learning and AI', 'Perception in Robotics']
            },
            {
              category: 'Systems & Control',
              courses: ['Advanced System Modeling Dynamics & Control', 'Design Optimization']
            }
          ]
        } as CourseCategorizedSection,
        {
          type: 'projects',
          content: [
            'Implemented AB3DMOT pipeline for 3D multi-object tracking using KITTI dataset',
            'Developed warehouse automation system using Divide Areas Algorithm for multi-robot coverage',
            'Designed state feedback and observer feedback controllers for 3-DoF robotic arm',
            'Created autonomous waypoint following and object detection system for Parrot Minidrone'
          ]
        } as ProjectsSection
      ]
    },
    {
      school: 'Karpagam College of Engineering',
      period: '2015 - 2019',
      degree: 'Bachelor of Engineering in Automobile Engineering',
      details: [
        {
          type: 'gpa',
          content: 'Graduated With Distinction from Anna University Affiliated Institution with <b>8.77 CGPA</b> (Equivalent to 3.9/4.0)'
        } as GPASection,
        {
          type: 'courseCategorized',
          title: 'Relevant Technical Coursework',
          content: [
            {
              category: 'Programming',
              courses: ['Java Programming', 'Advanced C Programming', 'Database Management Systems']
            },
            {
              category: 'Engineering',
              courses: ['Engineering Mechanics', 'Strength of Materials', 'Machine Drawing']
            },
            {
              category: 'Control Systems',
              courses: ['Vehicle Dynamics', 'Automotive Electronics']
            },
            {
              category: 'Design & Manufacturing',
              courses: ['Design of Automotive Components', 'Lean Manufacturing', 'Production Processes']
            }
          ]
        } as CourseCategorizedSection,
        {
          type: 'achievements',
          content: [
            'Received Best Student Award twice for academic excellence',
            'Led Team Griffin Riderz in SUPRA SAE (Formula SAE) competitions, improving team ranking by 56 positions',
            'Completed significant design optimization projects, achieving 15% weight reduction in chassis components'
          ]
        } as AchievementsSection
      ]
    }
  ];

  // Type guard functions to help with template type checking
  isGPASection(section: EducationSection): section is GPASection {
    return section.type === 'gpa';
  }

  isCourseCategorizedSection(section: EducationSection): section is CourseCategorizedSection {
    return section.type === 'courseCategorized';
  }

  isProjectsSection(section: EducationSection): section is ProjectsSection {
    return section.type === 'projects';
  }

  isAchievementsSection(section: EducationSection): section is AchievementsSection {
    return section.type === 'achievements';
  }
}