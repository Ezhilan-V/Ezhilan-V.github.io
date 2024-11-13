import { Component, ChangeDetectorRef  } from '@angular/core';

interface Project {
  title: string;
  role: string;
  description: string;
  imageUrls: string[];  // Changed from imageUrl to support multiple images
  technologies?: string[];
  highlights?: string[];
  timeline?: string;
}

interface ProjectCategory {
  name: string;
  icon: string;
  projects: Project[];
}
@Component({
  selector: 'app-project-card',
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.scss']
})
export class ProjectCardComponent {
  currentImageIndex: { [key: string]: number } = {};
  constructor(private cdr: ChangeDetectorRef) { }

  // projects = [
  //   {
  //     name: "Automobile",
  //     icon: "now-ui-icons transportation_bus-front-12",
  //     projects: [
  //       {
  //         title: "Supra - 2017",
  //         role: "Driver/Technical Lead",
  //         description: `I was the technical lead and worked with our team to
  //       develop a formula students vehicle by following the
  //       process of engineering design.I personally worked in the
  //       design of the powertrain,Chassis and suspension
  //       geometry.I was also the driver of the vehicle for the
  //       dynamic events`,
  //         imageUrl: "assets/img/supra2017.jpg"
  //       },
  //       {
  //         title: "Supra - 2018,FFS - 2019",
  //         role: "Team Captain",
  //         description: `I was the Team captain for our college formula students
  //         team. We as a team avoided our prior mistakes anda
  //         improved our ranking.I primarly concentrated on the
  //         fesibilty and technical aspects of the vehicle
  //         manufacturing process.`,
  //         imageUrl: "assets/img/supra2018.jpg"
  //       },
  //       {
  //         title: "BFKCT - 2018",
  //         role: "Team Captain/Driver",
  //         description: `I had been the team captain and driver for a Go-kart
  //         design and endurance event.We have build the entire
  //         vehicle from scratch in record time for the event.`,
  //         imageUrl: "assets/img/bfkct2018.jpg"
  //       },
  //       {
  //         title: "Provisioning of Q-gate",
  //         role: "Intern",
  //         description: `I was an intern in Ashok Leyland in the quality control
  //         department. During my time as an intern we have analysed
  //         the data of various defects and performed root cause
  //         analysis and modified the production line and added
  //         Quality Gate to improve effiency of the unit.`,
  //         imageUrl: "assets/img/ashokLeyland.jpg"
  //       },
  //       {
  //         title: "Variable Adaptive Suspension",
  //         role: "Project Lead",
  //         description: "Compared the performance characteristics of passive and active suspension and created a active suspension model to have optimum performance in both real world roads and race tracks using Smart materials",
  //         imageUrl: "assets/img/vasSimulation.jpg"
  //       }]

  //   }
  //   , {
  //     name: "Computer Science",
  //     icon: "now-ui-icons tech_laptop",
  //     projects: [
  //       {
  //         title: "Atlas",
  //         role: "UX designer and Full Stack Developer",
  //         description: "Developed an application to ",
  //         imageUrl: "assets/img/atlasCheckPoint.jpg"
  //       }, {
  //         title: "Infy Mansions",
  //         role: "UX designer and Developer",
  //         description: "Compared the performance characteristics of passive and active suspension and created a active suspension model to have optimum performance in both real world roads and race tracks using Smart materials",
  //         imageUrl: "assets/img/vasSimulation.jpg"
  //       }, {
  //         title: "Design Portal",
  //         role: "Developer",
  //         description: "Compared the performance characteristics of passive and active suspension and created a active suspension model to have optimum performance in both real world roads and race tracks using Smart materials",
  //         imageUrl: "assets/img/vasSimulation.jpg"
  //       }, {
  //         title: "Phillips CPQ",
  //         role: "Developer",
  //         description: "Compared the performance characteristics of passive and active suspension and created a active suspension model to have optimum performance in both real world roads and race tracks using Smart materials",
  //         imageUrl: "assets/img/vasSimulation.jpg"
  //       },
  //     ]
  //   }]
  projects = [
    {
      name: "Robotics",
      icon: "now-ui-icons tech_robot",
      projects: [
        {
          title: "Quadrotor Collision Detection",
          role: "Graduate Services Assistant",
          timeline: "Dec 2023 - Present",
          description: "Constructed a comprehensive dataset for quadrotor collision detection across 3 drones, 2 impact surfaces, and 6 collision speeds. Worked extensively with UR5 robotic arm to collect slow-motion video data of drone collisions, designing spring tension adjustments for flexible drones. Developed dynamic collision detection and recovery strategies.",
          imageUrls: ["assets/img/edge_not_aligned3.jpg", "assets/img/edge_aligned1_top.jpg","assets/img/edge_not_aligned1_top.jpg"], // Replace with actual drone images
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
      icon: "now-ui-icons tech_laptop",
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
      icon: "now-ui-icons transportation_bus-front-12",
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
  previousImage(projectTitle: string) {
    if (this.currentImageIndex[projectTitle] > 0) {
      this.currentImageIndex = {
        ...this.currentImageIndex,
        [projectTitle]: this.currentImageIndex[projectTitle] - 1
      };
      this.cdr.detectChanges(); // Force change detection
    }
  }

  nextImage(projectTitle: string, totalImages: number) {
    const currentIndex = this.currentImageIndex[projectTitle] || 0;
    if (currentIndex < totalImages - 1) {
      this.currentImageIndex = {
        ...this.currentImageIndex,
        [projectTitle]: currentIndex + 1
      };
      this.cdr.detectChanges(); // Force change detection
    }
  }
}