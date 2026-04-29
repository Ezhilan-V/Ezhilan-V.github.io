#!/usr/bin/env node
/* Append deeper sections to each per-branch JSON file. Run once. */

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'assets', 'data', 'learn');

const additions = {

  // ─── SETUP ──────────────────────────────────────────────────────
  setup: [
    {
      id: 'launch-system',
      heading: 'ROS 2 launch system, parameters, lifecycle',
      body: 'Launch files start your nodes; parameters configure them; lifecycle nodes give you start / stop / cleanup hooks. Get fluent in all three or your stack will be impossible to operate. ROS 2 launch is Python-based (XML and YAML are also supported but Python is the most flexible). Parameters can be loaded from YAML, set on the command line, or queried at runtime via ros2 param.',
      bullets: [
        'launch.py: import LaunchDescription, Node, IncludeLaunchDescription; compose declaratively',
        'Parameters: declare in code, override via --ros-args -p key:=value or YAML files',
        'Lifecycle: configure → activate → deactivate → cleanup → shutdown — survival is up to you',
        'Composition: ComponentContainer hosts many "components" in one process for IPC speed',
        'Use ros2 launch --show-args to discover what a launch file accepts'
      ],
      codeBlocks: [
        {
          language: 'python',
          title: 'launch/my_robot.launch.py — start two nodes with shared params',
          code: 'from launch import LaunchDescription\nfrom launch_ros.actions import Node\nimport os\nfrom ament_index_python.packages import get_package_share_directory\n\ndef generate_launch_description():\n    params = os.path.join(get_package_share_directory(\'my_robot\'), \'config\', \'robot.yaml\')\n    return LaunchDescription([\n        Node(package=\'my_robot\', executable=\'sensor_node\',\n             parameters=[params], output=\'screen\'),\n        Node(package=\'my_robot\', executable=\'planner_node\',\n             parameters=[params, {\'rate\': 20.0}], output=\'screen\')\n    ])'
        },
        {
          language: 'bash',
          title: 'Override a parameter at launch time',
          code: 'ros2 launch my_robot my_robot.launch.py rate:=50.0\nros2 param list /sensor_node\nros2 param get /sensor_node use_filtered'
        }
      ],
      links: [
        { label: 'ROS 2 launch tutorials', url: 'https://docs.ros.org/en/humble/Tutorials/Intermediate/Launch/Launch-Main.html' },
        { label: 'Lifecycle nodes', url: 'https://design.ros2.org/articles/node_lifecycle.html' }
      ]
    },
    {
      id: 'cross-compile',
      heading: 'Cross-compile for ARM (Jetson, Pi)',
      body: 'Native compilation on a Jetson takes forever. Cross-compile from your x86 dev machine: build the package against an ARM sysroot, then rsync the install tree onto the robot. The fastest path is a Docker buildx multiplatform image; the canonical path is rosdep + colcon with --merge-install pointed at an ARM toolchain.',
      codeBlocks: [
        {
          language: 'bash',
          title: 'Cross-build for arm64 with Docker buildx',
          code: 'docker buildx create --use --name multi-builder\ndocker buildx build \\\n    --platform linux/arm64 \\\n    -t my-registry/my-robot:arm64 \\\n    --load .\n# Push to robot:\ndocker save my-registry/my-robot:arm64 | \\\n    ssh robot@jetson "docker load"'
        }
      ],
      links: [
        { label: 'Cross-compile ROS 2 (official)', url: 'https://docs.ros.org/en/humble/How-To-Guides/Cross-compilation.html' }
      ]
    }
  ],

  // ─── PERCEPTION ─────────────────────────────────────────────────
  'computer-vision': [
    {
      id: 'depth-from-mono',
      heading: 'Monocular depth estimation',
      body: 'Single-camera depth used to be impossible without motion parallax. Modern transformers (MiDaS, ZoeDepth, Depth Anything V2) train on millions of mixed datasets and predict metric or relative depth from a single RGB image. Quality is now good enough for obstacle avoidance, AR, and rough scene understanding — though stereo + LiDAR still wins for safety-critical use.',
      bullets: [
        'MiDaS — relative depth, scale ambiguous, very robust',
        'ZoeDepth — metric depth, fine-tuned on indoor / outdoor splits',
        'Depth Anything V2 — current SOTA (2024), 25M parameters, runs on Jetson',
        'Marigold — diffusion-based; slower but extremely sharp at edges',
        'Use cases: AR overlay, obstacle proximity, rough 3D reconstruction',
        'Caveat: scale drifts with lens / environment; calibrate against a known target before trusting metric output'
      ],
      codeBlocks: [
        {
          language: 'python',
          title: 'Depth Anything V2 inference',
          code: 'from transformers import pipeline\nfrom PIL import Image\n\npipe = pipeline(task=\'depth-estimation\',\n                model=\'depth-anything/Depth-Anything-V2-Small-hf\',\n                device=0)\ndepth = pipe(Image.open(\'scene.jpg\'))[\'depth\']\ndepth.save(\'depth.png\')'
        }
      ],
      links: [
        { label: 'Depth Anything V2', url: 'https://depth-anything-v2.github.io/' },
        { label: 'ZoeDepth', url: 'https://github.com/isl-org/ZoeDepth' }
      ]
    },
    {
      id: '6d-pose',
      heading: '6-DoF object pose estimation',
      body: 'Knowing an object is in the scene (detection) is not enough for grasping — you need its full 6-DoF pose: position + orientation in the camera frame. Classic methods use known CAD models + ICP (PPF, Linemod). Modern learned methods (FoundationPose, PoseCNN, GDR-Net) generalize across objects without per-object training. FoundationPose (NVIDIA, 2024) sets the open-source bar — give it any RGB-D image and a CAD mesh, get the pose back.',
      bullets: [
        'Known model + ICP — classical baseline, accurate, slow, requires CAD',
        'PoseCNN, GDR-Net — supervised CNNs, need per-object training data',
        'FoundationPose — generalist, RGB-D + mesh, 2024 SOTA, ~50ms on a 4090',
        'MegaPose — RGB-only, mesh-conditioned, harder to get production-grade',
        'Output: 4×4 transform matrix, can drive MoveIt grasp planners directly'
      ],
      links: [
        { label: 'FoundationPose', url: 'https://nvlabs.github.io/FoundationPose/' },
        { label: 'BOP benchmark (pose evaluation)', url: 'https://bop.felk.cvut.cz/home/' }
      ]
    }
  ],

  // ─── MANIPULATION ───────────────────────────────────────────────
  manipulation: [
    {
      id: 'ros2-control',
      heading: 'ros2_control — the controller framework',
      body: 'ros2_control is the standard layer between your hardware drivers (motors, encoders) and your high-level planners (MoveIt). It provides a real-time deterministic control loop, a plugin system for hardware interfaces, and a controller manager that loads / unloads controllers (PID, joint trajectory, gravity comp, force-mode). If you build your own arm or AMR, you almost certainly want ros2_control.',
      bullets: [
        'Hardware interface plugin — talks to the actual motor drivers (CAN, EtherCAT, USB)',
        'Resource manager — tracks state interfaces (position, velocity, effort) per joint',
        'Controllers — joint_position, joint_trajectory, diff_drive, admittance, force_torque',
        'Realtime — runs in a SCHED_FIFO thread; no Python in the loop, only C++',
        'Spawner: load controllers without restarting your robot stack'
      ],
      codeBlocks: [
        {
          language: 'bash',
          title: 'List + spawn a controller',
          code: 'ros2 control list_hardware_interfaces\nros2 control list_controllers\nros2 control load_controller --set-state active joint_trajectory_controller'
        }
      ],
      links: [
        { label: 'ros2_control docs', url: 'https://control.ros.org/' }
      ]
    },
    {
      id: 'bimanual',
      heading: 'Bimanual & dual-arm manipulation',
      body: 'Two arms doing one task (folding a cloth, tying a knot, handing off an object) is dramatically harder than two arms doing two separate tasks. The challenge is coordination — both arms share a closed kinematic chain via the held object, so motion of one arm constrains the other. ALOHA (Stanford), Mobile ALOHA, and SusGraspNet are the open research playgrounds. Production: dual-arm KUKA / FR3 with shared MoveIt planning groups.',
      bullets: [
        'Closed-chain constraint — holding the same object means both arms move as one rigid system',
        'Coordinated planning — plan for both arms jointly, not independently',
        'Hand-offs — pre-grasp, grasp, sync, release — needs precise timing',
        'Demonstration data: ALOHA teleop rig (Stanford) is the open standard',
        'Imitation learning + diffusion policies have largely replaced classical bimanual planning'
      ],
      links: [
        { label: 'ALOHA / Mobile ALOHA', url: 'https://mobile-aloha.github.io/' }
      ]
    }
  ],

  // ─── NAVIGATION ─────────────────────────────────────────────────
  navigation: [
    {
      id: 'outdoor-nav',
      heading: 'Outdoor & off-road navigation',
      body: 'Outdoor robots break every assumption indoor stacks make. GPS works (with RTK for cm accuracy) but drops out under tree canopy. The "free space" is now traversability — a slope you can drive on, mud you can\'t. 3D LiDAR + dense semantic segmentation feeds a 2.5D elevation/cost map. Specialized stacks: Robotec\'s Vehicle Dynamics Simulator, Clearpath\'s outdoor stack, NASA\'s VIPER lunar rover stack.',
      bullets: [
        'GPS / RTK — absolute reference; falls back to LiDAR-IMU when satellites drop',
        'Traversability — instead of binary obstacle, score each cell by drive-ability',
        '2.5D elevation maps (GridMap) — capture height, slope, roughness per cell',
        'Path-tracking on rough terrain — pure pursuit struggles; switch to MPC',
        'Sensor IP rating — dust, rain, sun glare break consumer cameras quickly'
      ],
      codeBlocks: [
        {
          language: 'bash',
          title: 'GridMap + traversability example',
          code: 'sudo apt install -y ros-humble-grid-map\n# Layered map: elevation, slope, friction, semantic\nros2 run grid_map_demos GridMapVisualization \\\n    --ros-args -p map_topic:=/elevation_map'
        }
      ],
      links: [
        { label: 'GridMap', url: 'https://github.com/ANYbotics/grid_map' },
        { label: 'OpenPlanetary outdoor', url: 'https://www.openplanetary.org/' }
      ]
    },
    {
      id: 'social-nav',
      heading: 'Social navigation — sharing space with humans',
      body: 'A robot moving through a crowd needs more than collision avoidance — it needs to be predictable, polite, and respect social norms. Social Force Models (SFM) treat humans as charged particles; CADRL and SARL apply RL to learn socially-compliant motion. Pedestrian-aware Nav2 plugins (people_msgs, ROS Social Costmap Layer) feed human trajectories into your costmap so the robot slows in crowds and never cuts a pedestrian off.',
      bullets: [
        'Social Force Model — humans + robot as agents with attractive/repulsive forces',
        'CADRL / SARL / NaviGAN — RL policies trained in pedestrian sim',
        'People detection — leg detector (lidar) + YOLO-pose (camera); fuse with EKF',
        'Pedsim_ros — synthetic pedestrian crowd simulator for training/evaluation',
        'Norms: keep > 1m to a human, slow under 0.6 m/s near humans, never cut someone off'
      ],
      links: [
        { label: 'pedsim_ros', url: 'https://github.com/srl-freiburg/pedsim_ros' }
      ]
    }
  ],

  // ─── AI / ML ────────────────────────────────────────────────────
  'ai-ml': [
    {
      id: 'vision-foundation-models',
      heading: 'Vision foundation models',
      body: 'Robotics perception increasingly bootstraps from vision foundation models — large image encoders trained self-supervised on internet-scale data. DINOv2 (Meta) gives general-purpose features that segment, classify, and localize objects with little fine-tuning. Sapiens (Meta, 2024) is human-specific. Florence-2 / CLIP-V2 do open-vocab everything. The pattern: use the FM as a frozen backbone, train a small adapter head for your task.',
      bullets: [
        'DINOv2 — self-supervised ViT, frozen features, drop-in for segmentation / classification',
        'Sapiens (Meta 2024) — human pose, depth, segmentation; SOTA for human-centric tasks',
        'SAM 2 — promptable segmentation (point, box, text); video-aware',
        'Florence-2 (Microsoft) — open-vocab detection, captioning, segmentation in one tiny model',
        'EVA / EVA-02 — strong backbones competitive with DINOv2 at smaller scales',
        'Pattern: freeze FM weights, train small adapter; 100×-1000× less compute than scratch'
      ],
      codeBlocks: [
        {
          language: 'python',
          title: 'DINOv2 features for retrieval',
          code: 'import torch\nfrom torchvision import transforms\nfrom PIL import Image\n\nmodel = torch.hub.load(\'facebookresearch/dinov2\', \'dinov2_vits14\').cuda().eval()\ntfm = transforms.Compose([\n    transforms.Resize((224, 224)),\n    transforms.ToTensor(),\n    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),\n])\nx = tfm(Image.open(\'scene.jpg\')).unsqueeze(0).cuda()\nwith torch.no_grad():\n    feat = model(x)        # → (1, 384) embedding\n# Cosine-similar features → similar scenes / objects'
        }
      ],
      links: [
        { label: 'DINOv2', url: 'https://github.com/facebookresearch/dinov2' },
        { label: 'Sapiens', url: 'https://about.meta.com/realitylabs/codecavatars/sapiens/' },
        { label: 'Florence-2', url: 'https://huggingface.co/microsoft/Florence-2-large' }
      ]
    },
    {
      id: 'real-world-rl',
      heading: 'Real-world RL — beyond sim-to-real',
      body: 'Sim-to-real is the 2020-2023 playbook: train in sim with domain randomization, deploy on hardware. The 2024-2026 frontier is real-world RL — train policies directly on the robot. Q-Transformer (DeepMind), Robot Learning at Scale (Google), and ALOHA-2 collect millions of real episodes across many robots. Residual policies start from a sim-trained baseline and use real-world data only to fix the gap.',
      bullets: [
        'Q-Transformer — autoregressive Q-learning over discrete action tokens; scales to 1000+ episodes',
        'ALOHA-2 — bimanual real-world IL; ~100 demos per task is enough for many manipulations',
        'Residual policies — sim-trained base + small real-world correction; sample efficient',
        'Offline RL — RT-X dataset, CQL, IQL; bootstrap from existing logs',
        'World models on real data — Wayve\'s GAIA-1 trains driving in a learned world model',
        'Practical: start with IL, add RL only when IL plateaus and you can collect 10K+ episodes'
      ],
      links: [
        { label: 'Q-Transformer', url: 'https://qtransformer.github.io/' },
        { label: 'RT-X / Open-X', url: 'https://robotics-transformer-x.github.io/' }
      ]
    }
  ],

  // ─── SENSORS ────────────────────────────────────────────────────
  sensors: [
    {
      id: 'bus-protocols',
      heading: 'Bus protocols — CAN, EtherCAT, RS-485, SPI, I²C',
      body: 'Inside a robot, sensors and motor drivers don\'t speak ROS — they speak fieldbus protocols. CAN bus (250 kbps – 1 Mbps) dominates automotive and most industrial AMRs. EtherCAT (100 Mbps) runs synchronized motion control across many drives. RS-485 / Modbus shows up in cheaper sensors and PLCs. SPI / I²C are MCU-level for IMUs, ADCs, OLED displays.',
      bullets: [
        'CAN — 2-wire differential, robust to noise, broadcast, prioritized arbitration',
        'CAN-FD — flexible data-rate; up to 8 Mbps payload; modern robots use this',
        'EtherCAT — distributed clocks, sub-µs sync across many slaves; required for high-end servos',
        'RS-485 — multi-drop; cheap; used by most lidar drivers and industrial sensors',
        'SPI — fast (10+ Mbps), short distance (PCB), 4-wire; perfect for IMUs',
        'I²C — slow (100 kHz – 1 MHz), 2-wire, addressed; used for sensors, EEPROMs, OLEDs'
      ],
      codeBlocks: [
        {
          language: 'python',
          title: 'Read a CAN-bus message via python-can',
          code: 'import can\n\nbus = can.Bus(channel=\'can0\', interface=\'socketcan\')\nfor msg in bus:\n    if msg.arbitration_id == 0x123:\n        # Decode 8-byte payload\n        rpm = int.from_bytes(msg.data[0:2], \'little\', signed=True)\n        cur = int.from_bytes(msg.data[2:4], \'little\', signed=True) * 0.01\n        print(f\'rpm={rpm} cur={cur:.2f} A\')'
        }
      ],
      links: [
        { label: 'EtherCAT primer', url: 'https://www.ethercat.org/en/technology.html' },
        { label: 'python-can', url: 'https://python-can.readthedocs.io/' }
      ]
    },
    {
      id: 'mmwave-radar',
      heading: 'mmWave radar — the all-weather sensor',
      body: 'mmWave radar (60-77 GHz) sees through rain, dust, and darkness — where camera and lidar struggle. Modern automotive radars (Continental ARS, Bosch LRR4, Texas Instruments AWRxxxx evaluation modules) deliver 4D point clouds (range, angle, elevation, doppler velocity) at 20+ Hz. Used in self-driving cars, outdoor AMRs, drones, and increasingly in factories for human safety zones.',
      bullets: [
        'Frequencies: 24 GHz (legacy, banned in some regions), 77 GHz (automotive), 60 GHz (industrial)',
        'Doppler velocity per point — instantly tells you what\'s moving',
        'Sparse vs dense — TI AWR1843 gives ~256 points/frame, Arbe Phoenix gives 30K',
        'Pros: weather-immune, long range, velocity built-in',
        'Cons: poor lateral resolution, multipath ghosts, expensive (~$1K-5K for usable units)',
        'Sensor fusion: radar tells you THERE IS something at velocity v, camera tells you WHAT'
      ],
      links: [
        { label: 'TI mmWave SDK', url: 'https://www.ti.com/tool/MMWAVE-SDK' },
        { label: 'Arbe Robotics', url: 'https://arberobotics.com/' }
      ]
    }
  ],

  // ─── COMPUTE ────────────────────────────────────────────────────
  compute: [
    {
      id: 'qos-deep',
      heading: 'QoS — getting the right delivery guarantees',
      body: 'ROS 2 DDS lets every publisher and subscriber pick its own QoS profile — reliability (BEST_EFFORT vs RELIABLE), durability (VOLATILE vs TRANSIENT_LOCAL), history (KEEP_LAST vs KEEP_ALL), depth (queue size). Mismatched QoS = subscriber never receives. The defaults rarely fit production: sensor topics want BEST_EFFORT, commands want RELIABLE, latched topics need TRANSIENT_LOCAL.',
      bullets: [
        'BEST_EFFORT — fire and forget; right for sensor streams (image, scan, IMU)',
        'RELIABLE — retransmit until ACK; right for commands, parameters, lifecycle',
        'TRANSIENT_LOCAL — late-joining subscribers get the last N messages (latched)',
        'KEEP_ALL — never drop; bounded only by RAM. Use carefully',
        'Deadline + lifespan — safety-relevant topics; declare expected rate',
        'Liveliness — heartbeat semantics; detect dead publishers fast'
      ],
      codeBlocks: [
        {
          language: 'python',
          title: 'Sensor publisher with explicit QoS',
          code: 'from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy, HistoryPolicy\n\nsensor_qos = QoSProfile(\n    reliability=ReliabilityPolicy.BEST_EFFORT,\n    durability=DurabilityPolicy.VOLATILE,\n    history=HistoryPolicy.KEEP_LAST,\n    depth=5\n)\nself.pub = self.create_publisher(LaserScan, \'/scan\', sensor_qos)'
        }
      ],
      links: [
        { label: 'ROS 2 QoS overview', url: 'https://docs.ros.org/en/humble/Concepts/Intermediate/About-Quality-of-Service-Settings.html' }
      ]
    },
    {
      id: 'composition-lifecycle',
      heading: 'Composition + lifecycle for production stacks',
      body: 'Every ROS 2 node in its own process is convenient for development but wasteful for production — every topic between two nodes serializes, copies, and IPC-hops. Composition packs many "components" into one process so they can share memory directly via intra-process zero-copy. Lifecycle nodes give you deterministic startup / shutdown so your stack can recover from a sensor reboot without a full restart.',
      bullets: [
        'Component — a class that registers with a ComponentContainer instead of running its own main()',
        'Intra-process comms: zero-copy when both pub and sub live in the same container',
        'Container choice: rclcpp_components::ComponentManager for general use',
        'Lifecycle: unconfigured → inactive → active → inactive → finalized',
        'Activate / deactivate hooks: open / close hardware connections cleanly',
        'Use launch_ros.actions.LifecycleNode + register_event_handler for orchestration'
      ],
      codeBlocks: [
        {
          language: 'cpp',
          title: 'Register a node as a composable component',
          code: '#include <rclcpp/rclcpp.hpp>\n#include <rclcpp_components/register_node_macro.hpp>\n\nclass MyNode : public rclcpp::Node {\npublic:\n  explicit MyNode(const rclcpp::NodeOptions& opts)\n    : Node(\"my_node\", opts) { /* ... */ }\n};\n\nRCLCPP_COMPONENTS_REGISTER_NODE(MyNode)'
        }
      ],
      links: [
        { label: 'Composable nodes', url: 'https://docs.ros.org/en/humble/Concepts/Intermediate/About-Composition.html' }
      ]
    }
  ]
};

let totalAdded = 0;
for (const [slug, sections] of Object.entries(additions)) {
  const filePath = path.join(dir, slug + '.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  data.sections.push(...sections);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  totalAdded += sections.length;
  console.log(`✓ ${slug}: +${sections.length} sections (total ${data.sections.length})`);
}
console.log(`\nTotal added: ${totalAdded} sections`);
