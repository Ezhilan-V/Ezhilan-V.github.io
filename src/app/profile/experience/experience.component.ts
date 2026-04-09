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
      company: "Amazon Robotics Applied Automation",
      location: "Greater Boston Area, MA",
      role: "Systems Development Engineer",
      period: "May 2025 – Present",
      color: "bg-orange-500",
      responsibilities: [
        "Achieved 75% cost reduction ($800→$200/unit) developing Basler camera system in C++ replacing Honeywell scanners",
        "Built C++ imaging service wrapper for Basler Pylon SDK integrated with Jetson Orin edge devices",
        "Deployed solution to 130 edge devices across 6 fulfillment centers using AWS GreenGrass and Docker",
        "Created CloudWatch production alarms and monitoring dashboards for system reliability",
        "Led UWC setup for FastInduct as part of fleet management migration from CDM to UWC platform"
      ]
    },
    {
      id: "2",
      company: "Arizona State University",
      location: "Tempe, AZ",
      role: "Robotics Systems Engineer / Graduate Research Assistant",
      period: "Dec 2023 – May 2025",
      color: "bg-green-500",
      responsibilities: [
        "Conducted SILT for PX4-based X650 drones using Mission Planner and Ardupilot",
        "Developed path planning algorithms with obstacle avoidance in Python and C++ using ROS2 on Raspberry Pi 4",
        "Implemented AB3DMOT 3D tracking pipeline using Extended Kalman Filter improving metrics by 5% on KITTI dataset",
        "Integrated Intel RealSense D435 and Velodyne VLP-16 sensors with ROS2 for autonomous drone navigation",
        "Constructed quadrotor collision detection dataset with 1,080+ events using UR5 robotic arm"
      ],
      subProjects: [
        {
          id: "2.1",
          name: "ENSIL GROUP (EPICS Pro)",
          role: "Robotics Systems Engineer",
          description: "Autonomous drone systems and multi-robot path planning (May 2024 – May 2025)",
          technologies: ["ROS2", "Python", "C++", "PX4", "Ardupilot", "Gazebo", "Raspberry Pi 4", "Node.js", "DARP"],
          responsibilities: [
            "Conducted SILT for PX4-based X650 drones using Mission Planner and Ardupilot",
            "Developed path planning with obstacle avoidance using ROS2 on Raspberry Pi 4",
            "Engineered multi-robot DARP system achieving 100% coverage with 40% reduced exploration time",
            "Built Node.js backend for multi-robot communication reducing latency by 30%"
          ]
        },
        {
          id: "2.2",
          name: "Robotics and Intelligent Systems Lab",
          role: "Graduate Research Assistant",
          description: "3D perception and drone collision research (Dec 2023 – May 2024)",
          technologies: ["ROS2", "Python", "C++", "Extended Kalman Filter", "Point Cloud Processing", "Intel RealSense D435", "Velodyne VLP-16", "Isaac Sim"],
          responsibilities: [
            "Implemented AB3DMOT 3D tracking with Extended Kalman Filter — 5% improvement on KITTI",
            "Built Cylinder3D semantic segmentation with voxel-based point cloud processing",
            "Integrated RealSense D435 and Velodyne VLP-16 sensors with ROS2 in C++ and Python",
            "Constructed quadrotor collision dataset with 1,080+ events using UR5 robotic arm",
            "Worked with LIOSAM and ORB-SLAM pipelines in Isaac Sim for drone localization"
          ]
        }
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
        "Led team of 4 engineers developing React and Angular PLM applications with microservices architecture",
        "Reduced API calls by 30% and sprint backlogs by 40% through architecture optimization",
        "Engineered ATLAS ML-driven learning platform using MEAN stack increasing user engagement by 30%",
        "Implemented CI/CD pipelines with zero SonarQube issues",
        "Mentored 2,000+ engineers in programming and full-stack development"
      ],
      subProjects: [
        {
          id: "3.1",
          name: "ATLAS Learning Platform",
          role: "Full Stack Developer",
          description: "ML-driven learning path platform integrated with Wingspan",
          technologies: ["Angular", "Node.js", "Express", "MongoDB", "FabricJS", "D3.js"],
          responsibilities: [
            "Engineered ML-driven learning platform increasing user engagement by 30%",
            "Designed automated evaluation tool reducing evaluation time by 50%",
            "Developed interactive learning maps using FabricJS with interactive checkpoints"
          ]
        },
        {
          id: "3.2",
          name: "Design Portal",
          role: "Angular Developer",
          description: "Schematic diagram editor for Japanese construction firm",
          technologies: ["Angular", "draw.io", "TypeScript", "REST APIs"],
          responsibilities: [
            "Engineered custom draw.io build integrated within Angular application",
            "Created reusable components for drag-and-drop on complex hierarchical structures",
            "Reduced API calls by 45% through optimized component design"
          ]
        },
        {
          id: "3.3",
          name: "Configurator",
          role: "UI Lead",
          description: "CPQ platform for global health technology company using Configit Ace",
          technologies: ["React", "TypeScript", "Configit APIs", "PLM tools"],
          responsibilities: [
            "Led team of four engineers in React application development",
            "Achieved 40% decrease in sprint backlogs as team liaison",
            "Enforced code quality with 100% test coverage and zero SonarQube issues"
          ]
        }
      ]
    },
    {
      id: "4",
      company: "Ashok Leyland Ltd",
      location: "Hosur, India",
      role: "Automation Engineer Intern",
      period: "Aug 2018 – Dec 2018",
      color: "bg-red-500",
      responsibilities: [
        "Enhanced H-Series Engine production line efficiency by 10% through PLC automation",
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