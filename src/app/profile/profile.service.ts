import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  constructor(
  ) { }


  // professionalSummary = ["Skilled and motivated Full-stack developer with 3 years of relevant experience in developing responsive web applications",
  //   "I was trained in MEAN stack and later scaled up in ReactJs",
  //   "Conducted multiple unit-level training in Angular, React, Basics of HTML and CSS to facilitate project engagement and created POC, text and video courses for the same ",
  //   "Experience in projects execution using Agile and DevOps model.",
  //   "Constantly engaged in requirement discussions and refinement with clients from Japan, the Netherlands, and the UK"]


  // about = "I am an enthusiastic, self-motivated, and highly skilled MEAN and MERN stack developer with three years of relevant experience seeking opportunities to develop my skills and advance my career. My background includes working on highly process-oriented agile projects and providing training to individuals looking to advance their knowledge of UI technologies at both unit and organizational levels. On a regular basis, I communicate with the client and teams from other organizations about our work's progress and future milestones as a team of four developers."


  // exprienceData: any = [
  //   {
  //     id: 1,
  //     project: 'UI Track',
  //     unit: 'Education Training and development unit',
  //     timeline: 'May19-Jul20',
  //     role: 'Educator',
  //     summary: "Trained freshers in MEAN/MERN stack and developed tools for ETA application",
  //     technologies: ["Angular", "React", "Node", "Express", "HTML", "CSS", "Python", "Java", "MongoDB", "SQL(OracleDB)"],
  //     work: ["Trained more than 2000 trainees as an educator  in skills like HTML, CSS, JavaScript, Bootstrap, Angular MongoDB, Node and Express, Java  and RDBMS",
  //       "Designed and developed basic  full stack applications MEAN for training purposes",
  //       "Have mentored more than 20 groups in developing full stack projects",
  //       "Created POC,Text and video courses on UI technologies",
  //     ]
  //   }, {
  //     id: 2,
  //     project: 'Atlas',
  //     unit: 'Education Training and development unit',
  //     timeline: 'Jul20-May21',
  //     role: 'Full Stack Developer',
  //     summary: "Developed a platform for trainees to suggest the optimum learning paths form available courses as an add-on to the Wingspan learning platform",
  //     technologies: ["Angular", "React", "Node", "Express", "AdobeXD"],
  //     work: ["Developed wireframes and prototypes using adobeXD",
  //       "UI Development using Angular",
  //       "Logic to render maps with checkpoints and other intractable artifacts using fabricJs",
  //       "Backend development Express and mongoDB",
  //     ]
  //   }, {
  //     id: 3,
  //     project: 'Design Portal',
  //     unit: 'Engineering unit',
  //     timeline: 'May21-Dec21',
  //     role: 'Front End Developer',
  //     summary: "An Angular application with .net backend for Japanese Construction Firm to manage and optimize the design work flow",
  //     technologies: ["Angular", "React", "Node", "Express", "AdobeXD"],
  //     work: [
  //       "UI Development using Angular", "Draw.io customizations and integration with angular application"
  //     ]
  //   }, {
  //     id: 4,
  //     project: 'Configurator',
  //     unit: 'Engineering unit',
  //     timeline: 'Dec21-Present',
  //     role: 'UI Lead',
  //     summary: "A React application for a global health technology company to enable the users to manage CPQ tasks using the Configit Ace platform",
  //     technologies: ["Angular", "React", "Node", "Express", "AdobeXD"],
  //     work: [
  //       "UI development using React",
  //       "Discussing bottle necks and provide viable workarounds to the product owners",
  //       "Requirement discussion and refinement with PO and BA", "Code quality and defect analysis",
  //       "Work assignment to UI developers"
  //     ]
  //   },


  // ]

  professionalSummary = [
    "Systems Development Engineer at Amazon Robotics, developing production C++ imaging services deployed across 130 edge devices in 6 fulfillment centers",
    "MS in Robotics and Autonomous Systems (4.0 GPA, Graduated With Distinction) from Arizona State University — ROS2, autonomous drones, 3D perception",
    "Full-stack engineer with 3+ years at Infosys building React/Angular/MEAN enterprise applications with microservices architecture",
    "Research experience in 3D object tracking (AB3DMOT), semantic segmentation (Cylinder3D), and multi-robot path planning (DARP)",
    "Patent holder for Parkinson's biofeedback device (U.S. Application No: 63/574,771) — filed April 2024",
    "Track record of measurable impact: 75% cost reduction at Amazon, 100% area coverage in multi-robot systems, 30% API latency reduction at Infosys"
  ];

  about = `I am a Systems Development Engineer at Amazon Robotics, building high-performance C++ imaging services and deploying edge computing solutions across fulfillment centers. With a Master's in Robotics and Autonomous Systems from Arizona State University (4.0 GPA, Graduated With Distinction), I bridge cutting-edge robotics research and production engineering. My background spans autonomous drone systems, 3D object detection, multi-robot coordination, and enterprise full-stack development — building solutions that are both technically rigorous and production-ready.`;
  projects = [
    {
      name: "Robotics",
      icon: "precision_manufacturing",
      projects: [
        {
          title: "Quadrotor Collision Detection",
          role: "Graduate Research Assistant",
          timeline: "Dec 2023 - May 2024",
          description: "Constructed a comprehensive dataset for quadrotor collision detection across 3 drones, 2 impact surfaces, and 6 collision speeds. Worked extensively with UR5 robotic arm to collect slow-motion video data of drone collisions. Integrated Intel RealSense D435 and Velodyne VLP-16 sensors with ROS2 for autonomous drone navigation.",
          imageUrls: ["assets/img/edge_not_aligned3.jpg", "assets/img/edge_aligned1_top.jpg", "assets/img/edge_not_aligned1_top.jpg"],
          technologies: ["ROS2", "Python", "C++", "OpenCV", "Intel RealSense D435", "Velodyne VLP-16"],
          highlights: [
            "Improved ML detection accuracy by 25%",
            "Collected 1,080+ unique collision events",
            "Integrated multi-sensor fusion with ROS2",
            "Worked with LIOSAM and ORB-SLAM pipelines in Isaac Sim"
          ]
        },
        {
          title: "3D Multi-Object Tracking & Semantic Segmentation",
          role: "Graduate Research Assistant",
          timeline: "Dec 2023 - May 2024",
          description: "Implemented AB3DMOT 3D object tracking pipeline in Python using Extended Kalman Filter on the KITTI dataset. Built Cylinder3D semantic segmentation model for real-time 3D object recognition using voxel-based point cloud processing.",
          imageUrls: ["assets/img/edge_not_aligned3.jpg"],
          technologies: ["Python", "Extended Kalman Filter", "Point Cloud Processing", "3D Object Detection", "Deep Learning", "KITTI"],
          highlights: [
            "Improved sAMOTA and MOTP metrics by 5% on KITTI dataset",
            "Built Cylinder3D voxel-based segmentation model",
            "Implemented AB3DMOT tracking pipeline",
            "Real-time 3D object recognition capability"
          ]
        },
        {
          title: "Parkinson's Biofeedback Device",
          role: "Student Researcher",
          timeline: "Jan 2023 - Dec 2023",
          description: "Engineered a biofeedback device for Parkinson's patients, aiding in vocal intensity control for 80% of patients with speech disorders. Led the software development lifecycle from concept to prototype, including design, coding, testing, and documentation.",
          imageUrls: ["assets/img/ashokLeyland.jpg"],
          technologies: ["Embedded Systems", "Signal Processing", "Machine Learning"],
          highlights: [
            "Patent filed (U.S. Application No: 63/574,771) — April 2024",
            "Improved patient communication effectiveness by 35%",
            "Developed adaptive voice filters for 40 samples",
            "Successfully implemented with 80% of patients"
          ]
        },
        {
          title: "Multi-Robot Coverage Path Planning",
          role: "Robotics Systems Engineer",
          timeline: "May 2024 - May 2025",
          description: "Engineered a multi-robot coverage path planning system using the Divide Areas Algorithm (DARP) for warehouse automation in Gazebo simulation. Developed autonomous drone path planning with obstacle avoidance in Python and C++ using ROS2 on Raspberry Pi 4. Built Node.js backend for multi-robot communication.",
          imageUrls: ["assets/img/vasSimulation.jpg"],
          technologies: ["ROS2", "Python", "C++", "Gazebo", "Node.js", "DARP", "Raspberry Pi 4", "PX4", "Ardupilot"],
          highlights: [
            "Achieved 100% area coverage in warehouse automation",
            "Reduced exploration time by 40%",
            "Reduced system latency by 30% with Node.js backend",
            "Conducted SILT for PX4-based X650 drones"
          ]
        },
        {
          title: "Mambo Drone: Autonomous Line-Following",
          role: "Lead Developer",
          timeline: "Aug 2023 - Dec 2023",
          description: "Created a low-level software architecture for the Mambo mini drone, integrating control systems, sensor fusion, and computer vision to enable precise autonomous line-following capabilities. Implemented sophisticated control algorithms for stable flight dynamics using IMU and camera sensor fusion.",
          imageUrls: ["assets/img/vasSimulation.jpg"],
          technologies: ["MATLAB", "Simulink", "Control Systems", "Sensor Fusion", "Computer Vision", "IMU"],
          highlights: [
            "Autonomous waypoint following and object detection",
            "Implemented IMU and camera sensor fusion",
            "Edge detection and feature extraction for line tracking",
            "Designed state feedback and observer feedback controllers"
          ]
        },
        {
          title: "Hexapod Kinematics Simulator",
          role: "Lead Developer",
          timeline: "Aug 2023 - Dec 2023",
          description: "Modeled and controlled a hexapod robot using forward and inverse kinematics. Computed DH parameters and formulated kinematics for all six legs, enabling precise roll, pitch, yaw, and translation movements. Handled multiple constraints including ground avoidance and balance maintenance.",
          imageUrls: ["assets/img/vasSimulation.jpg"],
          technologies: ["MATLAB", "Forward Kinematics", "Inverse Kinematics", "DH Parameters", "Transformation Matrices"],
          highlights: [
            "Computed DH parameters for all hexapod legs",
            "Implemented forward and inverse kinematics",
            "Achieved stable roll, pitch, yaw, and translation",
            "Handled ground-avoidance and balance constraints"
          ]
        },
        {
          title: "ANN and MPC Controller for QuadRotor",
          role: "Lead Developer",
          timeline: "Aug 2023 - Dec 2023",
          description: "Performed hyperparameter tuning of an Artificial Neural Network for quadrotor control, matching 85% of MPC controller performance. Explored multiple modeling approaches for optimizing quad-rotor dynamics.",
          imageUrls: ["assets/img/vasSimulation.jpg"],
          technologies: ["Python", "TensorFlow", "Control Systems", "MATLAB", "MPC"],
          highlights: [
            "Achieved 85% MPC controller performance with ANN",
            "Optimized quadrotor dynamics model",
            "Implemented advanced control strategies"
          ]
        }
      ]
    },
    {
      name: "Software Development",
      icon: "terminal",
      projects: [
        {
          title: "ATLAS Learning Enhancement Tool",
          role: "Lead Developer",
          timeline: "2021 - 2022",
          description: "Led the development of ATLAS, a machine learning-driven learning enhancement tool that significantly improved user engagement and learning outcomes. Implemented comprehensive analytics and user tracking features.",
          imageUrls: ["assets/img/atlasCheckPoint.jpg"],
          technologies: ["MEAN Stack", "Machine Learning", "TypeScript", "Angular"],
          highlights: [
            "Increased user engagement by 30%",
            "Implemented automated evaluation system",
            "Developed interactive learning paths",
            "Created metrics dashboards using D3.js"
          ]
        },
        {
          title: "Design Portal Integration",
          role: "Angular Developer",
          timeline: "2020 - 2021",
          description: "Engineered a custom build of draw.io integrated within an Angular application to enable editing schematic diagrams. Created reusable Angular components to manage drag-and-drop operations for complex hierarchical structures.",
          imageUrls: ["assets/img/vasSimulation.jpg"], // Replace with design portal images
          technologies: ["Angular", "TypeScript", "draw.io", "REST APIs"],
          highlights: [
            "Reduced API calls by 45%",
            "Improved data processing efficiency",
            "Implemented seamless component communication",
            "Created reusable drag-and-drop components"
          ]
        },
        {
          title: "Configurator",
          role: "UI Developer",
          description: "Led a team of four engineers to develop and integrate a React application with Configit APIs and other PLM tools. Acted as a liaison between teams, ensuring clear communication and effective problem-solving across projects.",
          imageUrls: ["assets/img/vasSimulation.jpg"], // Replace with configurator images
          technologies: ["React", "PLM", "Configit", "TypeScript"],
          highlights: [
            "Decreased sprint backlogs by 40%",
            "Achieved 100% code coverage in unit tests",
            "Zero SonarQube issues",
            "Led team of 4 engineers"
          ]
        }
      ]
    },
    {
      name: "Automobile",
      icon: "engineering",
      projects: [
        {
          title: "SUPRA SAE 2018/FFS 2019",
          role: "Team Captain",
          timeline: "2018 - 2019",
          description: "Led the college formula student team as Team Captain, improving team ranking by 56 positions through strategic improvements and technical optimizations.",
          imageUrls: ["assets/img/supra2018.jpg"],
          technologies: ["CAD Design", "Vehicle Dynamics", "Project Management"],
          highlights: [
            "Improved team ranking by 56 positions",
            "Led technical aspects of vehicle manufacturing",
            "Optimized design and performance",
            "Managed team of student engineers"
          ]
        },
        {
          title: "SUPRA SAE 2017",
          role: "Driver/Technical Lead",
          timeline: "2016 - 2017",
          description: "Served as technical lead and driver for formula student vehicle development, focusing on powertrain, chassis, and suspension geometry design.",
          imageUrls: ["assets/img/supra2017.jpg"],
          technologies: ["CAD/CAM", "FEA", "Vehicle Dynamics"],
          highlights: [
            "Designed powertrain and chassis systems",
            "Optimized suspension geometry",
            "Performed as test driver",
            "Led technical design team"
          ]
        },
        {
          title: "BFKCT Go-Kart 2018",
          role: "Team Captain/Driver",
          timeline: "2018",
          description: "Led team as captain and driver in go-kart design and endurance event, building vehicle from scratch in record time.",
          imageUrls: ["assets/img/bfkct2018.jpg"],
          technologies: ["Mechanical Design", "Race Engineering", "Project Management"],
          highlights: [
            "Built complete vehicle in record time",
            "Led design and manufacturing",
            "Performed as lead driver",
            "Managed project timeline"
          ]
        },
        {
          title: "Quality Gate Implementation",
          role: "Automation Engineer Intern",
          timeline: "Aug 2018 - Dec 2018",
          description: "Enhanced H-Series Engine production line efficiency at Ashok Leyland through PLC automation strategies and implementation of quality gates.",
          imageUrls: ["assets/img/ashokLeyland.jpg"],
          technologies: ["PLC", "FMEA", "Quality Control", "Industrial Automation"],
          highlights: [
            "Improved production efficiency by 10%",
            "Reduced defects by 30%",
            "Optimized spare parts inventory by 20%",
            "Implemented automated quality gates"
          ]
        }
      ]
    }
  ];
  experienceData = [
    {
      id: 1,
      project: 'Amazon Robotics Applied Automation',
      unit: 'Amazon',
      timeline: 'May 2025 - Present',
      role: 'Systems Development Engineer',
      summary: "Building production C++ imaging services for high-speed tote processing in Amazon fulfillment centers, deployed across 130 edge devices",
      technologies: ["C++", "Basler Pylon SDK", "Jetson Orin", "AWS GreenGrass", "Docker", "CloudWatch"],
      work: [
        "Achieved 75% cost reduction ($800→$200/unit) developing Basler camera system in C++ using Pylon SDK replacing Honeywell scanners",
        "Built C++ imaging service wrapper for Basler Pylon SDK integrated with Jetson Orin edge devices following Carbon framework best practices",
        "Deployed solution to 130 edge devices across 6 fulfillment centers using AWS GreenGrass and Docker for Fast Induct and scanless technologies",
        "Created CloudWatch production alarms and monitoring dashboards to track system reliability and performance metrics",
        "Led UWC setup for FastInduct as part of fleet management migration from CDM to UWC platform"
      ]
    },
    {
      id: 2,
      project: 'ENSIL GROUP — Robotics Systems Engineer',
      unit: 'Arizona State University (EPICS Pro)',
      timeline: 'May 2024 - May 2025',
      role: 'Robotics Systems Engineer',
      summary: "Developed autonomous drone systems and multi-robot path planning for the ENSIL GROUP EPICS Pro program at ASU",
      technologies: ["ROS2", "Python", "C++", "PX4", "Ardupilot", "Gazebo", "Raspberry Pi 4", "Node.js", "DARP"],
      work: [
        "Conducted System Integration and Level Testing (SILT) for PX4-based X650 drones using Mission Planner and Ardupilot",
        "Developed path planning algorithms with obstacle avoidance in Python and C++ using ROS2 on Raspberry Pi 4 for autonomous drone navigation",
        "Engineered multi-robot coverage path planning system using DARP achieving 100% area coverage with 40% reduction in exploration time in Gazebo simulation",
        "Built Node.js backend for multi-robot communication reducing latency by 30%"
      ]
    },
    {
      id: 3,
      project: 'Graduate Research Assistant',
      unit: 'Robotics and Intelligent Systems Lab, ASU',
      timeline: 'Dec 2023 - May 2024',
      role: 'Graduate Research Assistant',
      summary: "Research in 3D perception, autonomous drone navigation, and quadrotor collision detection at the ASU Robotics and Intelligent Systems Lab",
      technologies: ["ROS2", "Python", "C++", "OpenCV", "Extended Kalman Filter", "Point Cloud Processing", "Intel RealSense D435", "Velodyne VLP-16", "Isaac Sim"],
      work: [
        "Implemented AB3DMOT 3D object tracking pipeline using Extended Kalman Filter improving sAMOTA and MOTP metrics by 5% on KITTI dataset",
        "Built Cylinder3D semantic segmentation model for real-time 3D object recognition using voxel-based point cloud processing",
        "Integrated Intel RealSense D435 and Velodyne VLP-16 sensors with ROS2 in C++ and Python for autonomous drone navigation",
        "Constructed quadrotor collision detection dataset with 1,080+ events using UR5 robotic arm improving ML detection accuracy by 25%",
        "Worked with LIOSAM and ORB-SLAM pipelines in Isaac Sim and ROS2 for drone localization"
      ]
    },
    {
      id: 4,
      project: 'Senior Systems Engineer',
      unit: 'Infosys Limited',
      timeline: 'May 2019 - Jul 2022',
      role: 'Senior Systems Engineer',
      summary: "Led development of React and Angular enterprise applications with microservices, trained 2,000+ engineers, and built ATLAS ML-driven learning platform",
      technologies: ["React", "Angular", "TypeScript", "Node.js", "Express", "MongoDB", "draw.io", "Configit", "CI/CD", "SonarQube"],
      work: [
        "Led team of 4 engineers developing React and Angular PLM applications with microservices architecture reducing API calls by 30% and sprint backlogs by 40%",
        "Engineered ATLAS ML-driven learning platform using MEAN stack increasing user engagement by 30%",
        "Developed automated evaluation tool using MEAN stack for test scripts and certification processes",
        "Implemented CI/CD pipelines and enforced code quality with SonarQube maintaining zero issues",
        "Mentored 2,000+ engineers in programming and full-stack development"
      ]
    },
    {
      id: 5,
      project: 'Automation Engineer Intern',
      unit: 'Ashok Leyland Ltd',
      timeline: 'Aug 2018 - Dec 2018',
      role: 'Automation Engineer Intern',
      summary: "Enhanced H-Series Engine production line efficiency through PLC automation and quality gate implementation",
      technologies: ["PLC", "FMEA", "Quality Control", "Industrial Automation"],
      work: [
        "Enhanced H-Series Engine production line efficiency by 10% through PLC automation strategies",
        "Implemented PLC-enforced Quality Gates reducing defects by 30%",
        "Optimized spare parts inventory management reducing costs by 20%"
      ]
    }
  ];
  resumeurl = "https://drive.google.com/file/d/1XY0xlYDX8aZA1KwCnnjH6Y3G4iTWcV-D/view?usp=sharing"
  exprience(): Observable<any> {
    // return this.http.get(this.baseUrl + 'exprience');
    return of(this.experienceData);
  }
}
