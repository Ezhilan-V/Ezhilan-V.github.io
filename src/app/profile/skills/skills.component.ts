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
  selectedCategory: string | null = null;
  categories: SkillCategory[];

  readonly skillIconMap: Record<string, string> = {
    // Robotics & Autonomy
    'ROS2':               'fas fa-robot',
    'Nav2':               'fas fa-route',
    'MoveIt2':            'fas fa-drafting-compass',
    'Gazebo':             'fas fa-cube',
    'Isaac Sim':          'fas fa-vr-cardboard',
    'SLAM':               'fas fa-map-marked-alt',
    'Path Planning':      'fas fa-route',
    'Motion Planning':    'fas fa-route',
    'MPC':                'fas fa-sliders-h',
    'Multi-Robot Systems':'fas fa-sitemap',
    'PX4':                'fas fa-paper-plane',
    'Ardupilot':          'fas fa-paper-plane',
    // Computer Vision & Perception
    'OpenCV':                  'fas fa-eye',
    'PyTorch':                 'fas fa-fire',
    '3D Object Detection':     'fas fa-cube',
    '3D Semantic Segmentation':'fas fa-layer-group',
    'Point Cloud Processing':  'fas fa-braille',
    'Sensor Fusion':           'fas fa-compress-arrows-alt',
    'LiDAR-Camera Fusion':     'fas fa-camera',
    'Extended Kalman Filter':  'fas fa-wave-square',
    // Languages & Tools
    'C++':        'fas fa-code',
    'Python':     'fab fa-python',
    'MATLAB':     'fas fa-calculator',
    'TypeScript': 'fab fa-js-square',
    'Linux':      'fab fa-linux',
    'CMake':      'fas fa-tools',
    'Git':        'fab fa-git-alt',
    // Cloud, Edge & Embedded
    'AWS IoT Greengrass': 'fab fa-aws',
    'Docker':             'fab fa-docker',
    'AWS CloudWatch':     'fab fa-aws',
    'CI/CD':              'fas fa-infinity',
    'Jetson Orin':        'fas fa-microchip',
    'Raspberry Pi 4':     'fas fa-microchip',
    'Pixhawk':            'fas fa-microchip',
    'Intel RealSense D435':'fas fa-camera',
    'Velodyne VLP-16':    'fas fa-dot-circle',
    // Web & Full-Stack
    'Angular':      'fab fa-angular',
    'React':        'fab fa-react',
    'Node.js':      'fab fa-node-js',
    'Express.js':   'fab fa-node',
    'MongoDB':      'fas fa-database',
    'RESTful APIs': 'fas fa-exchange-alt',
    'WebSocket':    'fas fa-plug',
    // Mechanical & CAD
    'SolidWorks':     'fas fa-drafting-compass',
    'CATIA':          'fas fa-drafting-compass',
    'AutoCAD':        'fas fa-pencil-ruler',
    'Ansys FEA':      'fas fa-atom',
    'MSC ADAMS':      'fas fa-cogs',
    'Simulink':       'fas fa-project-diagram',
    'Vehicle Dynamics':'fas fa-car',
    'Chassis Design': 'fas fa-car-side',
    'PLC':            'fas fa-industry',
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
      this.clearFilter();
    } else {
      this.selectedSkill    = normalized;
      this.selectedCategory = null;
      this.profileService.setSkillFilter(normalized);
      this.scrollToProjects();
    }
  }

  selectCategory(cat: SkillCategory) {
    if (this.selectedCategory === cat.name) {
      this.clearFilter();
    } else {
      this.selectedCategory = cat.name;
      this.selectedSkill    = null;
      this.profileService.setSkillCategoryFilter(cat.name, cat.skills);
      this.scrollToProjects();
    }
  }

  isSkillSelected(skill: string): boolean {
    const normalized = skill.replace(/\s*\(.*?\)/, '').trim();
    return this.selectedSkill === normalized;
  }

  isCategorySelected(catName: string): boolean {
    return this.selectedCategory === catName;
  }

  clearFilter() {
    this.selectedSkill    = null;
    this.selectedCategory = null;
    this.profileService.clearAllFilters();
  }

  private scrollToProjects() {
    setTimeout(() => {
      document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}
