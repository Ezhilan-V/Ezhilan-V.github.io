import { Component } from '@angular/core';
import { ProfileService, SkillCategory } from '../profile.service';

@Component({
  standalone: false,
  selector: 'app-skills',
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.scss']
})
export class SkillsComponent {
  selectedSkill: string | null = null;
  categories: SkillCategory[];

  readonly skillIconMap: Record<string, string> = {
    // Robotics
    'ROS2': 'fas fa-robot',
    'Nav2': 'fas fa-route',
    'MoveIt': 'fas fa-drafting-compass',
    'Gazebo': 'fas fa-cube',
    'PX4': 'fas fa-paper-plane',
    'Ardupilot': 'fas fa-paper-plane',
    'SLAM': 'fas fa-map-marked-alt',
    'Path Planning': 'fas fa-route',
    'Motion Planning': 'fas fa-route',
    'MPC': 'fas fa-sliders-h',
    'Multi-Robot Systems': 'fas fa-sitemap',
    'DARP': 'fas fa-th',
    // Perception
    '3D Object Detection': 'fas fa-cube',
    '3D Semantic Segmentation': 'fas fa-layer-group',
    'Point Cloud Processing': 'fas fa-braille',
    'Extended Kalman Filter': 'fas fa-wave-square',
    'Sensor Fusion': 'fas fa-compress-arrows-alt',
    'OpenCV': 'fas fa-eye',
    'LiDAR-Camera Fusion': 'fas fa-camera',
    'Intel RealSense D435': 'fas fa-camera',
    'Velodyne VLP-16': 'fas fa-dot-circle',
    // Programming
    'C++ (Advanced)': 'fas fa-code',
    'Python': 'fab fa-python',
    'TypeScript': 'fab fa-js-square',
    'JavaScript': 'fab fa-js',
    'Java': 'fab fa-java',
    'MATLAB': 'fas fa-calculator',
    'Bash': 'fas fa-terminal',
    'CMake': 'fas fa-tools',
    'Git': 'fab fa-git-alt',
    // Cloud & Embedded
    'AWS GreenGrass': 'fab fa-aws',
    'Docker': 'fab fa-docker',
    'CloudWatch': 'fab fa-aws',
    'CI/CD': 'fas fa-infinity',
    'Jetson Orin': 'fas fa-microchip',
    'Raspberry Pi 4': 'fas fa-microchip',
    'Pixhawk': 'fas fa-microchip',
    'UR5 Robotic Arm': 'fas fa-robot',
    // Web
    'Angular': 'fab fa-angular',
    'React': 'fab fa-react',
    'Node.js': 'fab fa-node-js',
    'Express.js': 'fab fa-node',
    'MongoDB': 'fas fa-database',
    'Socket.io': 'fas fa-plug',
    'WebSocket': 'fas fa-plug',
    'RESTful APIs': 'fas fa-exchange-alt',
    'MEAN Stack': 'fas fa-layer-group',
    // Mechanical
    'SolidWorks': 'fas fa-drafting-compass',
    'CATIA': 'fas fa-drafting-compass',
    'AutoCAD': 'fas fa-pencil-ruler',
    'Simulink': 'fas fa-project-diagram',
    'Ansys FEA': 'fas fa-atom',
    'MSC ADAMS': 'fas fa-cogs',
    'Vehicle Dynamics': 'fas fa-car',
    'Chassis Design': 'fas fa-car-side',
    'PLC Programming': 'fas fa-industry',
  };

  constructor(private profileService: ProfileService) {
    this.categories = this.profileService.skills;
  }

  getIcon(skill: string): string | null {
    return this.skillIconMap[skill] ?? null;
  }

  selectSkill(skill: string) {
    const normalized = skill.replace(/\s*\(.*?\)/, '').trim();
    if (this.selectedSkill === normalized) {
      this.selectedSkill = null;
      this.profileService.setSkillFilter(null);
    } else {
      this.selectedSkill = normalized;
      this.profileService.setSkillFilter(normalized);
      setTimeout(() => {
        document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  isSelected(skill: string): boolean {
    const normalized = skill.replace(/\s*\(.*?\)/, '').trim();
    return this.selectedSkill === normalized;
  }

  clearFilter() {
    this.selectedSkill = null;
    this.profileService.setSkillFilter(null);
  }
}
