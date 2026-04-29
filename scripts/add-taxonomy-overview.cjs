#!/usr/bin/env node
/**
 * Insert a "Sub-branches & specializations" overview section as section[0] of
 * each field branch (skips setup + foundations). Idempotent — replaces any
 * existing section with id 'taxonomy-overview'.
 *
 * The overview anchors each branch in the canonical academic robotics
 * taxonomy and lists the career specializations within it.
 */

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'assets', 'data', 'learn');

const overviews = {
  'computer-vision': {
    heading: 'Sub-branches & specializations',
    body: "Computer Vision is the canonical sub-branch of Sensing & Perception that turns raw pixels into geometry, objects, and semantic understanding. It draws from image processing, projective geometry, machine learning, and (increasingly) large foundation models. In the robotics stack it produces the structured beliefs that planning and control consume. The sub-branches below each have their own deep literature — pick one to specialize in.",
    bullets: [
      "Sub-branch — 2D image processing (filtering, edges, color spaces, morphology)",
      "Sub-branch — 3D vision (stereo, depth, structure-from-motion, point clouds)",
      "Sub-branch — Object detection & recognition (YOLO, DETR, OWL-ViT, SAM)",
      "Sub-branch — Semantic / instance segmentation (DeepLab, Mask2Former, SAM 2)",
      "Sub-branch — Visual SLAM (ORB-SLAM3, RTAB-Map, Kimera)",
      "Sub-branch — Optical flow & motion (RAFT, Lucas-Kanade)",
      "Sub-branch — 6-DoF pose estimation (FoundationPose, MegaPose)",
      "Sub-branch — Visual servoing & active vision",
      "Career — Computer Vision Engineer (perception team, AV / AMR / arm)",
      "Career — Perception Engineer (typically AV-focused: BEV fusion, lane detection)",
      "Career — ML Vision Researcher (open-vocab models, foundation models)",
      "Career — Image Processing Algorithm Engineer (industrial inspection, medical)",
      "Related branches — Sensors (cameras, LiDAR), AI/ML (vision FMs), Manipulation (grasp planning from RGB-D)"
    ]
  },
  'manipulation': {
    heading: 'Sub-branches & specializations',
    body: "Manipulation sits across two canonical branches — Mechanical Design & Kinematics (the geometry of arms / fingers) and Control Systems (executing motion). Modern manipulation increasingly pulls from AI/ML for grasping and dexterous skills. The career market is large and bifurcated: classical kinematics + planning roles vs learning-based policy roles.",
    bullets: [
      "Sub-branch — Forward & inverse kinematics (DH, Lie groups, redundancy)",
      "Sub-branch — Robot dynamics (Newton-Euler, Lagrangian, inertial parameters)",
      "Sub-branch — Motion planning (RRT*, OMPL, CHOMP, STOMP, TrajOpt)",
      "Sub-branch — Grasping (antipodal, force-closure, GraspNet, AnyGrasp)",
      "Sub-branch — Trajectory time-parameterization (TOPP-RA, TOPP-MP)",
      "Sub-branch — Force / impedance / admittance control",
      "Sub-branch — Bimanual + dexterous manipulation (ALOHA, Allegro hand)",
      "Sub-branch — Soft robotics & compliant actuators",
      "Sub-branch — Industrial manipulation (welding, painting, palletizing)",
      "Career — Robotics Software Engineer (manipulation specialty)",
      "Career — Motion Planning Engineer (MoveIt, custom planners)",
      "Career — Mechanical Engineer (robotic-arm design, gripper design)",
      "Career — Manipulation Policy Engineer (RL/IL on arms, learn-from-demos)",
      "Career — Surgical Robotics Engineer (Intuitive, CMR, Vicarious Surgical)",
      "Related branches — AI/ML (policies), Sensors (force/torque), HRI (hand-guiding cobots)"
    ]
  },
  'navigation': {
    heading: 'Sub-branches & specializations',
    body: "Navigation is mostly Control Systems + AI applied to mobile platforms — answering 'where am I, where am I going, what's the next safe motion'. The same sub-branches show up in every mobile robot, from a Roomba to an autonomous vehicle.",
    bullets: [
      "Sub-branch — Mobile-robot kinematics (diff-drive, Ackermann, mecanum, swerve)",
      "Sub-branch — Localization (AMCL, EKF, GPS+IMU fusion, place recognition)",
      "Sub-branch — SLAM (slam_toolbox, ORB-SLAM3, FAST-LIO2, RTAB-Map)",
      "Sub-branch — Costmaps & obstacle representation",
      "Sub-branch — Path planning (A*, Theta*, Hybrid-A*, RRT, lattice)",
      "Sub-branch — Path tracking / local control (DWB, MPPI, pure pursuit, MPC)",
      "Sub-branch — Behavior trees & mission management (BehaviorTree.CPP, Nav2 BTs)",
      "Sub-branch — Outdoor + off-road (RTK, traversability, GridMap)",
      "Sub-branch — Social navigation (Pedsim, CADRL, SARL)",
      "Career — Navigation Engineer (Nav2, custom stacks)",
      "Career — SLAM Engineer (visual / lidar SLAM specialist)",
      "Career — Path Planning / Decision-Making Engineer",
      "Career — Mobile Robot Software Engineer (full-stack)",
      "Related branches — AMR (deployment), AV (highway), Sensors (LiDAR/IMU/GPS), Compute (real-time)"
    ]
  },
  'amr': {
    heading: 'Sub-branches & specializations',
    body: "AMR is the applied-engineering branch around mobile robots in industrial / commercial settings. It pulls Navigation as its core but adds fleet coordination, charging, safety certification, and integration with enterprise software (WMS, MES, ERP). The job market is dominated by warehouse-automation companies and 'AMR-as-a-product' startups.",
    bullets: [
      "Sub-branch — Drive systems (diff-drive, mecanum, Ackermann, swerve)",
      "Sub-branch — Indoor localization beyond AMCL (UWB, AprilTags, Wi-Fi/BLE)",
      "Sub-branch — Fleet management (Open-RMF, MiR Fleet, OTTO Fleet)",
      "Sub-branch — VDA 5050 vendor-neutral protocol",
      "Sub-branch — Charging & docking (contact, inductive, opportunity)",
      "Sub-branch — Safety certification (ANSI R15.08, ISO 3691-4, EN 1525)",
      "Sub-branch — WMS / MES / ERP integration (SAP EWM, Manhattan, Blue Yonder)",
      "Sub-branch — Traffic supervision & MAPF",
      "Sub-branch — Legged AMRs (Spot, Anymal, Unitree)",
      "Career — AMR Engineer / Robotics Software Engineer (mobile platforms)",
      "Career — Fleet Software Engineer (Open-RMF, custom orchestration)",
      "Career — Field Application Engineer (deploy + tune at customer sites)",
      "Career — Robot Safety Engineer (R15.08 certification)",
      "Career — Warehouse Automation Architect (whole-warehouse design)",
      "Related branches — Navigation (core), Multi-Robot (fleet), Sensors (safety lidar), HRI (human-zone behavior)"
    ]
  },
  'autonomous-vehicles': {
    heading: 'Sub-branches & specializations',
    body: "Autonomous Vehicles is the highest-funded application of Control Systems + Perception + AI. The stack is large but has a clear topology — perception → behavior → trajectory → control — and the SAE J3016 levels frame the regulatory + engineering requirements. AV pays the highest salaries in robotics and has the most specialized job market.",
    bullets: [
      "Sub-branch — Levels of autonomy (SAE J3016 L0–L5)",
      "Sub-branch — Drive-by-wire interfaces (CAN, Dataspeed, OEM SDKs)",
      "Sub-branch — HD maps + BEV sensor fusion (BEVFusion, FUTR3D, occupancy networks)",
      "Sub-branch — L2 ADAS (lane keep, ACC, AEB)",
      "Sub-branch — Behavior planning (FSM, BT, learned planners — MotionLM)",
      "Sub-branch — Trajectory generation (Frenet, lattice, MPC, MPPI)",
      "Sub-branch — V2X communication (C-V2X, DSRC, J2735)",
      "Sub-branch — Open-source AV stacks (Autoware, Apollo, OpenPilot)",
      "Sub-branch — Functional safety (ISO 26262, SOTIF / ISO 21448)",
      "Sub-branch — AV simulation (CARLA, AWSIM, Applied, dSPACE)",
      "Career — AV Software Engineer (full-stack)",
      "Career — Perception Engineer (AV) — usually the largest team",
      "Career — Behavior Planner / Decision-Making Engineer",
      "Career — Functional Safety Engineer (FuSa) — domain expert role",
      "Career — Localization Engineer (HD maps, lidar localization)",
      "Career — AV Simulation Engineer (scenario design, regression testing)",
      "Related branches — Perception (BEV), Navigation (path tracking), Sensors (lidar/radar/camera), AI/ML (learned planners)"
    ]
  },
  'ai-ml': {
    heading: 'Sub-branches & specializations',
    body: "AI & Machine Learning is the canonical 'brain' branch — the discipline of building robots that learn from data instead of being explicitly programmed. The robotics-ML community is small but moving fast; sub-branches here are roughly in order of how recently they emerged. Career-wise, this is the highest-leverage area in 2026 — every major robotics company is building or buying an ML team.",
    bullets: [
      "Sub-branch — Reinforcement Learning (PPO, SAC, TD3, model-based: Dreamer, TD-MPC2)",
      "Sub-branch — Imitation Learning (BC, DAgger, ACT, Diffusion Policy)",
      "Sub-branch — Sim-to-real transfer (domain randomization, residual policies, system ID)",
      "Sub-branch — Vision-Language Models (CLIP, SAM 2, Florence-2, LLaVA)",
      "Sub-branch — Vision-Language-Action models (RT-2, OpenVLA, Octo, π0)",
      "Sub-branch — LLM planners (Code-as-Policies, SayCan, ReAct)",
      "Sub-branch — World models (Dreamer, TD-MPC2, GAIA-1)",
      "Sub-branch — Foundation models for robotics (RDT, Octo, generalist policies)",
      "Sub-branch — Robot datasets (Open-X-Embodiment, DROID, BridgeData V2, RH20T)",
      "Sub-branch — Reward design + RLHF / DPO for robots",
      "Career — ML Engineer (Robotics) — most common; PyTorch + sim + IL/RL",
      "Career — Reinforcement Learning Researcher (DeepMind, OpenAI, academia)",
      "Career — Foundation Model Engineer (Physical Intelligence, Skild, 1X)",
      "Career — Sim-to-Real Engineer (Nvidia Isaac, Anyverse, Wayve)",
      "Career — Robot Learning Researcher (CMU, MIT, Stanford, Meta FAIR)",
      "Career — Imitation Learning / Demo Collection Engineer (ALOHA, Mobile ALOHA)",
      "Related branches — All of them. AI/ML touches every other branch"
    ]
  },
  'sensors': {
    heading: 'Sub-branches & specializations',
    body: "Sensing & Perception is the canonical 'sense organs' branch. Perception (interpretation) is covered in the Computer Vision branch; Sensors covers the physical hardware, drivers, calibration, and the bus protocols. Specialists here are highly valued because sensor problems are usually hidden inside what looks like a perception or planning bug.",
    bullets: [
      "Sub-branch — Cameras (RGB, RGB-D, stereo, event, thermal, hyperspectral)",
      "Sub-branch — LiDAR (2D rotating, 3D mechanical, solid-state, MEMS)",
      "Sub-branch — IMU (MEMS, fiber-optic; accel + gyro + mag)",
      "Sub-branch — Joint encoders (incremental, absolute, magnetic, resolver)",
      "Sub-branch — Force / torque / tactile (ATI, Robotiq, GelSight, Xela)",
      "Sub-branch — GPS / GNSS / RTK (u-blox F9P, Septentrio)",
      "Sub-branch — Bus protocols (CAN, EtherCAT, RS-485, SPI, I²C)",
      "Sub-branch — mmWave radar (TI, Continental, Arbe)",
      "Sub-branch — Sensor calibration (intrinsic, extrinsic, hand-eye, Kalibr)",
      "Sub-branch — Time synchronization (PTP, chrony, hardware trigger)",
      "Career — Sensor Integration Engineer (drivers + bring-up + characterization)",
      "Career — Calibration Engineer (factory + field calibration pipelines)",
      "Career — Sensor Fusion Engineer (EKF / UKF / graph SLAM)",
      "Career — Hardware Engineer (sensor electronics, driver boards)",
      "Career — Test Engineer (regression bench tests, environmental stress)",
      "Related branches — Perception (consumes sensor data), Compute (drivers + bus), AMR/AV (safety sensors)"
    ]
  },
  'compute': {
    heading: 'Sub-branches & specializations',
    body: "Compute is the platform branch — the hardware + OS + middleware + networking that everything else runs on. It's not a canonical academic branch but it's a real career track. Specialists here unblock the other teams: a misconfigured QoS or a saturated DDS bus stops a robot just as effectively as a perception bug.",
    bullets: [
      "Sub-branch — Embedded compute (Jetson Orin family, Raspberry Pi, Coral)",
      "Sub-branch — x86 mini-PCs / NUCs (Intel NUC, Beelink, Minisforum)",
      "Sub-branch — GPUs (inference + training; Jetson vs discrete RTX)",
      "Sub-branch — Real-time Linux (PREEMPT_RT, Xenomai)",
      "Sub-branch — Microcontrollers + micro-ROS (STM32, Teensy, RP2040)",
      "Sub-branch — Networking & DDS tuning (Cyclone DDS, FastDDS, Zenoh)",
      "Sub-branch — QoS profiles (BEST_EFFORT vs RELIABLE, deadlines, liveliness)",
      "Sub-branch — Composition + lifecycle nodes (intra-process zero-copy)",
      "Sub-branch — Logging, telemetry, observability (Foxglove, Prometheus, Grafana)",
      "Sub-branch — Power & thermal (battery sizing, BMS, Jetson nvpmodel)",
      "Career — Robotics Embedded Engineer (firmware + drivers + RT loops)",
      "Career — Robotics Systems Engineer (full-stack platform integration)",
      "Career — Robotics DevOps / Infrastructure (CI for robots, OTA updates, fleet ops)",
      "Career — Real-Time Systems Engineer (control loops, bus determinism)",
      "Related branches — Sensors (drivers), Manipulation (real-time control), AMR (fleet ops)"
    ]
  },
  'multi-robot': {
    heading: 'Sub-branches & specializations',
    body: "Multi-Robot Systems is the discipline of coordinating two or more robots for a shared outcome. It's not in the original canonical list but is a recognized academic field with its own conferences (DARS, ICRA workshops). The hard problems are coordination, communication under partition, and emergent behavior — a different skill set from single-robot work.",
    bullets: [
      "Sub-branch — Architectures (centralized / decentralized / hierarchical)",
      "Sub-branch — Communication (DDS namespacing, MQTT, Zenoh)",
      "Sub-branch — Multi-Agent Path Finding (CBS, ECBS, PBS, lifelong-MAPF)",
      "Sub-branch — Task allocation (Hungarian, auctions, CBBA, MILP)",
      "Sub-branch — Multi-robot SLAM (LAMP, DCL-SLAM, Kimera-Multi)",
      "Sub-branch — Formation control (leader-follower, virtual structure, behavior)",
      "Sub-branch — Swarm robotics (boids, ant-colony, Kilobots)",
      "Sub-branch — Distributed consensus (Raft, gossip, average consensus)",
      "Sub-branch — Open-RMF + production fleet stacks",
      "Career — Multi-Robot Systems Engineer (rare role; usually fleet or swarm specialty)",
      "Career — Fleet Coordination Engineer (Open-RMF, traffic supervision)",
      "Career — Swarm Researcher (academic / defense)",
      "Career — Distributed Systems Engineer (consensus, comms, fault tolerance)",
      "Related branches — AMR (production fleets), AI/ML (multi-agent RL), HRI (multi-human/multi-robot)"
    ]
  },
  'drones': {
    heading: 'Sub-branches & specializations',
    body: "Drones / Aerial Robotics is the application of Control + Perception to flying vehicles. It splits into hobby / racing (Betaflight, sub-250g), commercial (DJI, Skydio, Wing, Zipline), and defense (Loyal Wingman, Replicator, FPV swarms). Each sector has its own engineering culture and regulatory regime.",
    bullets: [
      "Sub-branch — Drone types (multirotor, fixed-wing, VTOL, hybrid)",
      "Sub-branch — Multirotor dynamics + motor mixing",
      "Sub-branch — Attitude control (cascade PID, INDI, MPC)",
      "Sub-branch — Position control (GPS hold, optical flow, VIO)",
      "Sub-branch — Autopilots (PX4, Ardupilot, Betaflight, Crazyflie firmware)",
      "Sub-branch — MAVLink protocol & GCS",
      "Sub-branch — Autonomous flight (missions, geofence, fail-safes)",
      "Sub-branch — Aerial perception (gimbals, thermal, multispectral, stereo)",
      "Sub-branch — Drone swarms (Crazyswarm, light shows, defense FPV)",
      "Sub-branch — eVTOL (Joby, Wisk, Vertical Aerospace) — passenger-carrying",
      "Career — Drone Software Engineer (autopilot + autonomy)",
      "Career — Flight Controls Engineer (attitude / position controllers)",
      "Career — Aerial Perception Engineer (downward + forward perception)",
      "Career — Drone Swarm Researcher (academic / defense)",
      "Career — UAS Test Engineer (regulatory + envelope expansion)",
      "Career — eVTOL Engineer (FAA Part 23 / Part 25 compliant flight software)",
      "Related branches — Control (cascade PIDs), Perception (downward camera + lidar), Sensors (IMU + GPS + altimeter)"
    ]
  }
};

let count = 0;
for (const [slug, overview] of Object.entries(overviews)) {
  const filePath = path.join(dir, slug + '.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const newSection = {
    id: 'taxonomy-overview',
    heading: overview.heading,
    body: overview.body,
    bullets: overview.bullets
  };
  // Replace if exists, otherwise insert at position 0
  const existing = data.sections.findIndex(s => s.id === 'taxonomy-overview');
  if (existing >= 0) {
    data.sections[existing] = newSection;
  } else {
    data.sections.unshift(newSection);
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  count++;
  console.log(`  ${slug.padEnd(22)}  +1 overview section, ${data.sections.length} total`);
}
console.log(`\nUpdated ${count} branches with taxonomy-overview sections.`);
