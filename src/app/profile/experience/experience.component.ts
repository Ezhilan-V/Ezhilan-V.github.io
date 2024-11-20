import { Component, OnInit } from '@angular/core';
import * as AOS from 'aos';

interface Experience {
  id: string;
  company: string;
  location: string;
  role: string;
  period: string;
  color: string;
  responsibilities: string[];
  subProjects?: Project[];
}

interface Project {
  id: string;
  name: string;
  role: string;
  description: string;
  technologies: string[];
  responsibilities: string[];
}

@Component({
  selector: 'app-experience',
  templateUrl: './experience.component.html',
  styleUrls: ['./experience.component.scss']
})
export class ExperienceComponent implements OnInit {
  workexp: Experience[] = [
    {
      id: "1",
      company: "Robotics and Intelligent Systems Lab (ASU)",
      location: "Mesa, AZ",
      role: "Graduate Services Assistant",
      period: "Dec 2023 – Present",
      color: "bg-green-500",
      responsibilities: [
        "Constructed comprehensive dataset for quadrotor collision detection across 3 drones",
        "Worked with UR5 robotic arm to collect slow-motion video data",
        "Developed dynamic Angular web application for dataset visualization",
        "Designed and manufactured key drone components"
      ]
    },
    {
      id: "2",
      company: "Barrow Neurological Institute",
      location: "Phoenix, AZ",
      role: "Student Researcher",
      period: "Jan 2023 – Dec 2023",
      color: "bg-blue-500",
      responsibilities: [
        "Engineered biofeedback device for Parkinson's patients",
        "Led software development lifecycle from concept to prototype",
        "Devised adaptive voice filters on dataset of 40 samples",
        "Filed patent (U.S. Application No: 63/574,771) for the device"
      ]
    },
    {
      id: "3",
      company: "Infosys Limited",
      location: "Mysore, India",
      role: "Senior Systems Engineer",
      period: "May 2019 – Jul 2022",
      color: "bg-yellow-500",
      responsibilities: [
        "Led team of four engineers in developing PLM systems",
        "Implemented microservices architecture reducing latency by 30%",
        "Optimized system design reducing API calls by 45%",
        "Mentored over 2,000 new hires in programming fundamentals"
      ],
      subProjects: [
        {
          id: "3.1",
          name: "UI Track",
          role: "MEAN Stack Developer",
          description: "Training and development platform",
          technologies: ["JavaScript", "MEAN Stack", "DevOps", "Agile", "SDLC"],
          responsibilities: [
            "Trained over 2,000 new hires in JavaScript and MEAN Stack",
            "Designed automated evaluation tool reducing evaluation time by 50%",
            "Developed interactive learning paths using CanvasJs and D3.js"
          ]
        },
        {
          id: "3.2",
          name: "Design Portal",
          role: "Angular Developer",
          description: "Schematic diagram editor integration",
          technologies: ["Angular", "draw.io", "TypeScript"],
          responsibilities: [
            "Engineered custom build of draw.io within Angular application",
            "Created reusable components for drag-and-drop operations",
            "Improved UX through seamless component communication"
          ]
        },
        {
          id: "3.3",
          name: "Configurator",
          role: "UI Developer",
          description: "PLM integration project",
          technologies: ["React", "Configit APIs", "PLM tools"],
          responsibilities: [
            "Led team of four engineers in React application development",
            "Acted as liaison between teams reducing sprint backlogs by 40%",
            "Enforced code quality with 100% test coverage"
          ]
        }
      ]
    },
    {
      id: "4",
      company: "Ashok Leyland Ltd",
      location: "Hosur, India",
      role: "Automation Engineer",
      period: "Aug 2018 – Dec 2018",
      color: "bg-red-500",
      responsibilities: [
        "Enhanced H-Series Engine production line efficiency by 10%",
        "Implemented PLC-enforced Quality Gates reducing defects by 30%",
        "Optimized spare parts inventory management reducing costs by 20%"
      ]
    }
  ];


  expandedExp: string | null = null;
  expandedProj: string | null = null;

  constructor() { }

  ngOnInit(): void {
    AOS.init({
      duration: 1000,
      once: true,
      mirror: false,
      offset: 100
    });
  }

  toggleExperience(expId: string): void {
    this.expandedExp = this.expandedExp === expId ? null : expId;
  }

  toggleProject(projId: string): void {
    this.expandedProj = this.expandedProj === projId ? null : projId;
  }

  isExperienceExpanded(expId: string): boolean {
    return this.expandedExp === expId;
  }

  isProjectExpanded(projId: string): boolean {
    return this.expandedProj === projId;
  }
}