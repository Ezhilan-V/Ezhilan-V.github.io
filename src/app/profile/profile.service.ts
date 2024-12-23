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
    "Graduate student in Robotics and Autonomous Systems with expertise in robotics software development, computer vision, and machine learning",
    "Full-stack developer with 3.3 years of experience in developing enterprise applications using MEAN/MERN stack",
    "Currently focused on robotics research including quadrotor collision detection, biofeedback devices, and multi-robot systems",
    "Led development teams and managed client relationships across international projects",
    "Experience in both research-oriented robotics development and enterprise software solutions",
    "Patent holder (pending) for innovative Parkinson's patient biofeedback device"
  ];

  about = `I am a graduate student in Robotics and Autonomous Systems at Arizona State University, combining strong software development experience with cutting-edge robotics expertise. My background spans enterprise software development, where I led teams in developing complex applications, to current research in robotics and autonomous systems. I specialize in developing solutions that bridge the gap between theoretical robotics and practical applications, with particular focus on drone systems, human-robot interaction, and multi-robot coordination.`;
  projects = [
    {
      name: "Robotics",
      icon: "precision_manufacturing",
      projects: [
        {
          title: "Quadrotor Collision Detection",
          role: "Graduate Services Assistant",
          timeline: "Dec 2023 - Present",
          description: "Constructed a comprehensive dataset for quadrotor collision detection across 3 drones, 2 impact surfaces, and 6 collision speeds. Worked extensively with UR5 robotic arm to collect slow-motion video data of drone collisions, designing spring tension adjustments for flexible drones. Developed dynamic collision detection and recovery strategies.",
          imageUrls: ["assets/img/edge_not_aligned3.jpg", "assets/img/edge_aligned1_top.jpg", "assets/img/edge_not_aligned1_top.jpg"], // Replace with actual drone images
          technologies: ["ROS2", "Python", "Computer Vision", "Machine Learning", "Angular"],
          highlights: [
            "Improved collision detection accuracy by 25%",
            "Developed real-time data visualization dashboard",
            "Collected 1080 unique experimental samples",
            "Reduced development time by 30%"
          ]
        },
        {
          title: "Parkinson's Biofeedback Device",
          role: "Student Researcher",
          timeline: "Jan 2023 - Dec 2023",
          description: "Engineered a biofeedback device for Parkinson's patients, aiding in vocal intensity control for 80% of patients with speech disorders. Led the software development lifecycle from concept to prototype, including design, coding, testing, and documentation.",
          imageUrls: ["assets/img/ashokLeyland.jpg"], // Replace with biofeedback device images
          technologies: ["Embedded Systems", "Signal Processing", "Machine Learning"],
          highlights: [
            "Patent pending (U.S. Application No: 63/574,771)",
            "Improved patient communication effectiveness by 35%",
            "Developed adaptive voice filters for 40 samples",
            "Successfully implemented with 80% of patients"
          ]
        },
        {
          title: "Multi-Robot Coverage Path Planning",
          role: "Project Lead",
          timeline: "Aug 2023 - Dec 2023",
          description: "Developed a warehouse automation system using Divide Areas Algorithm, achieving 100% coverage and 40% reduced exploration time. Engineered Node.js backend architecture for multi-robot communication.",
          imageUrls: ["assets/img/vasSimulation.jpg"], // Replace with warehouse automation images
          technologies: ["ROS", "Node.js", "Path Planning", "Multi-Robot Systems"],
          highlights: [
            "Achieved 100% coverage in warehouse automation",
            "Reduced exploration time by 40%",
            "Reduced system latency by 30%",
            "Improved operational efficiency by 40%"
          ]
        },
        {
          title: "ANN and MPC Controller for QuadRotor",
          role: "Lead Developer",
          timeline: "Aug 2023 - Dec 2023",
          description: "Performed hyperparameter tuning of an Artificial Neural Network for quadrotor control, matching 85% of MPC controller performance. Explored multiple modeling approaches for optimizing quad-rotor dynamics.",
          imageUrls: ["assets/img/vasSimulation.jpg"], // Replace with quadrotor images
          technologies: ["Python", "TensorFlow", "Control Systems", "MATLAB"],
          highlights: [
            "Achieved 85% MPC controller performance",
            "Optimized quadrotor dynamics",
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
      project: 'Robotics and Intelligent Systems Lab',
      unit: 'Arizona State University',
      timeline: 'Dec 2023 - Present',
      role: 'Graduate Services Assistant',
      summary: "Developing quadrotor collision detection systems and datasets for autonomous drone systems",
      technologies: ["ROS2", "Python", "Computer Vision", "TensorFlow", "PyTorch", "Angular", "WebSockets"],
      work: [
        "Constructed a comprehensive dataset for quadrotor collision detection across 3 drones, 2 impact surfaces, and 6 collision speeds",
        "Developed a dynamic Angular web application to showcase datasets and configurations",
        "Designed and manufactured key components for drone prototypes, reducing development time by 30%",
        "Innovating admittance and recovery controllers for quadrotor collision recovery",
        "Collected and analyzed 1080 unique experimental samples"
      ]
    },
    {
      id: 2,
      project: 'Parkinson\'s Biofeedback Research',
      unit: 'Barrow Neurological Institute',
      timeline: 'Jan 2023 - Dec 2023',
      role: 'Student Researcher',
      summary: "Led the development of a novel biofeedback device for Parkinson's patients, significantly improving speech control capabilities",
      technologies: ["Embedded Systems", "Signal Processing", "Machine Learning", "Hardware Design"],
      work: [
        "Engineered a biofeedback device aiding vocal intensity control for 80% of patients",
        "Led complete software development lifecycle from concept to prototype",
        "Developed adaptive voice filters improving communication effectiveness by 35%",
        "Filed patent (U.S. Application No: 63/574,771) for the innovative device",
        "Collected and analyzed data from 40 voice samples for system optimization"
      ]
    },
    {
      id: 3,
      project: 'Configurator',
      unit: 'Engineering Unit',
      timeline: 'Dec 2021 - Jul 2022',
      role: 'UI Lead',
      summary: "Led development of a React application for Phillips healthcare's CPQ platform using Configit Ace, managing team of four developers",
      technologies: ["React", "TypeScript", "Configit", "PLM", "REST APIs"],
      work: [
        "Led team of four engineers in developing and integrating PLM systems",
        "Implemented microservices architecture reducing system latency by 30%",
        "Managed stakeholder communication with clients from multiple countries",
        "Enforced code quality with 100% test coverage and zero SonarQube issues",
        "Achieved 40% decrease in sprint backlogs through effective team coordination"
      ]
    },
    {
      id: 4,
      project: 'Design Portal',
      unit: 'Engineering Unit',
      timeline: 'May 2021 - Dec 2021',
      role: 'Frontend Developer',
      summary: "Developed Angular application with .NET backend for Japanese construction firm to optimize design workflows",
      technologies: ["Angular", "TypeScript", "draw.io", "REST APIs"],
      work: [
        "Engineered custom draw.io integration within Angular application",
        "Created reusable components for complex hierarchical structures",
        "Reduced API calls by 45% through optimized component design",
        "Implemented seamless parent-child component communication",
        "Enhanced data processing efficiency through optimized architecture"
      ]
    },
    {
      id: 5,
      project: 'ATLAS Learning Platform',
      unit: 'Education Training and Development Unit',
      timeline: 'Jul 2020 - May 2021',
      role: 'Full Stack Developer',
      summary: "Developed an AI-driven learning path suggestion platform integrated with Wingspan learning platform",
      technologies: ["Angular", "Node.js", "Express", "MongoDB", "FabricJS"],
      work: [
        "Developed wireframes and prototypes using Adobe XD",
        "Created interactive learning maps using FabricJS",
        "Implemented backend services with Express and MongoDB",
        "Integrated with existing Wingspan platform",
        "Developed map rendering logic with interactive checkpoints"
      ]
    },
    {
      id: 6,
      project: 'UI Track',
      unit: 'Education Training and Development Unit',
      timeline: 'May 2019 - Jul 2020',
      role: 'Technical Educator',
      summary: "Led comprehensive training programs in full-stack development technologies",
      technologies: ["Angular", "React", "Node.js", "Express", "MongoDB", "Java"],
      work: [
        "Trained over 2,000 developers in full-stack development",
        "Created comprehensive video and text course materials",
        "Mentored 20+ project groups in developing full-stack applications",
        "Designed and developed MEAN stack applications for training",
        "Created evaluation tools and learning metrics dashboards"
      ]
    }
  ];
  resumeurl = "https://drive.google.com/file/d/1XY0xlYDX8aZA1KwCnnjH6Y3G4iTWcV-D/view?usp=sharing"
  exprience(): Observable<any> {
    // return this.http.get(this.baseUrl + 'exprience');
    return of(this.experienceData);
  }
}
