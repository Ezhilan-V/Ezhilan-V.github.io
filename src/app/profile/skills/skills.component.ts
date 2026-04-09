import { Component } from '@angular/core';

interface SkillCategory {
  name: string;
  icon: string;
  color: string;
  skills: string[];
}

@Component({
  selector: 'app-skills',
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.scss']
})
export class SkillsComponent {
  categories: SkillCategory[] = [
    {
      name: 'Programming',
      icon: 'code',
      color: 'from-blue-600 to-blue-400',
      skills: ['C++ (Advanced)', 'Python', 'TypeScript', 'Kotlin', 'JavaScript', 'MATLAB', 'Bash', 'CMake', 'Git']
    },
    {
      name: 'Robotics & Autonomy',
      icon: 'precision_manufacturing',
      color: 'from-green-600 to-green-400',
      skills: ['ROS2', 'Nav2', 'MoveIt', 'RViz', 'Gazebo', 'PX4', 'Ardupilot', 'SLAM', 'Path Planning', 'Motion Planning', 'MPC', 'Multi-Robot Systems']
    },
    {
      name: 'Perception & Sensing',
      icon: 'visibility',
      color: 'from-purple-600 to-purple-400',
      skills: ['OpenCV', '3D Object Detection', '3D Semantic Segmentation', 'Point Cloud Processing', 'LiDAR-Camera Fusion', 'Sensor Fusion', 'Extended Kalman Filter', 'Intel RealSense D435', 'Velodyne VLP-16', 'Basler Pylon SDK']
    },
    {
      name: 'Hardware & Embedded',
      icon: 'developer_board',
      color: 'from-orange-600 to-orange-400',
      skills: ['Jetson Orin', 'Raspberry Pi 4', 'Pixhawk', 'UR5 Robotic Arm', 'IMU', 'Encoders']
    },
    {
      name: 'Cloud & DevOps',
      icon: 'cloud',
      color: 'from-cyan-600 to-cyan-400',
      skills: ['AWS GreenGrass', 'Docker', 'CloudWatch', 'CI/CD', 'SonarQube', 'JIRA', 'Agile']
    },
    {
      name: 'Web Development',
      icon: 'web',
      color: 'from-pink-600 to-pink-400',
      skills: ['React', 'Angular', 'Node.js', 'Express.js', 'WebSocket', 'RESTful APIs', 'Microservices', 'MongoDB']
    }
  ];
}
