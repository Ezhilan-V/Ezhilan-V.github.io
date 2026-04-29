#!/usr/bin/env node
/**
 * Replace each branch's hero.intro and hero.tagline with a beginner-first
 * version. Front-load a one-line analogy + "why does this matter" before
 * the technical detail. Also updates the matching hero in index.json.
 */

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'assets', 'data', 'learn');

const HEROES = {
  setup: {
    tagline: "Get a working robot dev environment in an afternoon",
    intro: "Before you can do anything else, your laptop has to be able to talk to a robot - real or simulated. This branch is the install + first-bring-up checklist: ROS 2 (the operating system most robots run), Gazebo (a 3D simulator so you don't need hardware to start), MoveIt and Nav2 (the toolkits for arms and mobile robots), and the dev tools that keep you sane. Don't skim - the time you spend here is the time you don't waste later debugging a broken setup."
  },
  foundations: {
    tagline: "The math and code every robotics book assumes you already know",
    intro: "Most robotics tutorials drop you into matrix transforms and Bayesian filters without warning. This branch is the prereq pack so that doesn't happen to you. Linear algebra (poses + frames are just matrices), calculus and optimization (planners minimize cost), probability (sensors are noisy), Python and C++ idioms (numpy and Eigen show up everywhere), debugging patterns, and curated books. None of it is robotics-specific yet - that's the point. Skip what you already know."
  },
  'mechanical-design': {
    tagline: "The physical body - links, joints, and the math that moves them",
    intro: "Robots are made of bodies. Before perception, planning, or control mean anything, you need to know what the robot is shaped like and how it can move. This branch covers the basics: rigid bodies, joints, actuators, the difference between forward kinematics (joints to position) and inverse kinematics (position to joints), the URDF file that describes a robot to ROS, and the design process that takes a use case and turns it into hardware. If you've never picked up a textbook on robot mechanics, start here."
  },
  sensors: {
    tagline: "How a robot perceives the world - and how to pick the right sensor",
    intro: "A robot is only as smart as what it can sense. Cameras give pixels, LiDAR gives ranges, IMUs give acceleration, encoders give joint angles - each sensor has a job and a failure mode. This branch is the field guide: how each sensor actually works, what its noise looks like, when to pick one over another, how to calibrate it, and how to wire it up to ROS. Pick the right sensor and the rest of your stack gets easier; pick the wrong one and no algorithm will save you."
  },
  'computer-vision': {
    tagline: "Turning pixels and depth into something the robot can act on",
    intro: "Computer vision is the part of the robot that watches and understands. Given an image (or a depth map, or a point cloud), it decides 'there is a cup here, oriented like this, the door is open, the path is clear'. Everything downstream - planning, manipulation, navigation - depends on it being right. This branch walks the pipeline: how a camera projects 3D into 2D, classical image processing, deep object detection on a ROS topic, point clouds, sensor fusion, SLAM, and 6-DoF pose estimation. By the end you can build the perception layer of a real robot."
  },
  'control-systems': {
    tagline: "The nervous system - turning plans into actual motion",
    intro: "A planner says 'go to (x, y) heading north'. A controller is what makes that actually happen, fighting friction, gravity, motor delays, and noisy sensors 1000 times a second. Get controllers right and the robot looks elegant; get them wrong and it shakes, overshoots, or crashes. This branch starts at the most useful three-letter algorithm in the world (PID), then moves up to state-space methods, model predictive control, force / impedance control for contact, real-time scheduling, and the ros2_control framework that wraps it all up. If you only learn one branch, learn this one."
  },
  'ai-ml': {
    tagline: "Robots that learn - the modern stack from RL to VLAs",
    intro: "Everything traditional in robotics is hand-engineered: someone wrote the perception code, someone tuned the controller, someone designed the planner. The modern shift is that robots can learn these layers end to end - from reinforcement learning that figures out how to walk in simulation, to imitation learning that copies a human demo, to vision-language-action models like π0 and GR00T that take 'put the dish in the sink' as input and output joint commands. This branch is a tour of that stack with what each technique does, when to reach for it, and code to start with."
  },
  hri: {
    tagline: "Where robots and humans share space, intent, and trust",
    intro: "A robot in a lab is an engineering problem. A robot near a person is a different problem - now you have to think about safety, predictability, communication, and trust. Human-Robot Interaction (HRI) is the design discipline behind shared autonomy, natural-language commanding (now LLM-powered), gesture recognition, the safety standards that let cobots work next to humans without fences, teleoperation rigs (which double as training-data factories), haptic feedback, and the social robots people see most. If you're building something that touches a human - directly or indirectly - read this."
  },
  manipulation: {
    tagline: "Arms, hands, fingers - moving things in the real world",
    intro: "Manipulation is everything that turns a desired pose ('put the gripper here, oriented like this') into the joint commands the motors will follow. It bundles kinematics (where is the hand right now?), motion planning (a safe path through clutter), control (faithfully executing that path), and grasping (closing the fingers without crushing the cup). This branch starts with a 3-DOF leg you can drag in your browser, then moves to MoveIt 2 (the production manipulation stack for ROS), classical motion planners, force-aware control, and the modern learning-based approaches that have taken over dexterous tasks."
  },
  navigation: {
    tagline: "Where am I? Where am I going? What's the next safe move?",
    intro: "Navigation is the loop a mobile robot runs forever: localize itself, plan a path to a goal, and drive without hitting anything. In ROS 2 that loop is Nav2 - a planner stack that takes a map, a goal, and a steady stream of sensor data, and emits velocity commands. This branch walks the loop end to end: how a differential-drive base actually works, how Bayes filters make sense of noisy sensors, how SLAM builds a map while you drive, how costmaps tell the planner where not to go, and how behavior trees turn it all into a mission. Newcomers should start here right after Setup."
  },
  amr: {
    tagline: "Autonomous mobile robots - the warehouse and hospital workhorse",
    intro: "An AMR (Autonomous Mobile Robot) is a navigation stack on wheels - it senses obstacles, plans around them, talks to a fleet manager, charges itself, and integrates with the warehouse software that tells it what to move where. AMRs are the most-deployed mobile robot in the world today, in fulfillment centers, hospitals, factories, and last-mile delivery. This branch covers the full stack: drive systems, indoor localization, fleet protocols (VDA 5050), charging and docking, safety certification (ANSI R15.08), and how it all plugs into a WMS. If your job involves a robot that has to live in a real building, read this."
  },
  'autonomous-vehicles': {
    tagline: "Self-driving cars, trucks, and shuttles - the robotics stack at 30 m/s",
    intro: "Autonomous vehicles are mobile robots running at highway speeds in unstructured shared environments, with safety budgets in milliseconds. The stack overlaps heavily with AMRs but adds road-specific perception (lane lines, traffic signals, pedestrians), HD maps, V2X, drive-by-wire interfaces, and the ISO 26262 / SOTIF safety regimes. This branch covers the canonical AV stack from sensor fusion through behavior and motion planning, plus the open platforms (Autoware, Apollo, OpenPilot) and what production deployments actually look like in 2026. If you've ever wondered how a Waymo car decides to merge, this is for you."
  },
  drones: {
    tagline: "Robots that fly - multirotor, fixed-wing, and the autopilots that fly them",
    intro: "Aerial robots add a third spatial dimension and a constant fight against gravity. The hardest parts of grounded robotics - balance, stability, fail-safes - are foreground concerns from the first power-up. This branch covers the modern drone stack: how a multirotor stays in the air (motor mixing, cascade attitude + position control), the production autopilots (PX4, Ardupilot, Betaflight), the MAVLink protocol every drone speaks, autonomous mission planning, swarms, and real-world applications from agriculture to inspection to defense."
  },
  'multi-robot': {
    tagline: "Many robots, one outcome - architectures, MAPF, and swarms",
    intro: "Multi-robot systems are not just one robot times N. You inherit new problems: who decides who does what, how robots avoid each other, how they share a map, how they survive a comms blackout, and how the system degrades when one robot fails. This branch covers the canonical patterns: centralized vs decentralized architectures, multi-agent path finding (MAPF), multi-robot SLAM, market-based task allocation, formation control, and the swarm-style algorithms that scale to hundreds of agents. If your fleet is bigger than two, you need this."
  },
  compute: {
    tagline: "What runs the code - GPUs, real-time Linux, and the hardware foundation",
    intro: "Choosing your robot's compute is choosing your ceiling for everything else - perception throughput, control loop rate, ML model size, battery life. This branch covers the major options (NVIDIA Jetson, x86 NUCs, Raspberry Pi, Coral), when each makes sense, and the boring-but-critical concerns: real-time scheduling so a 1 kHz controller doesn't jitter, network latency, power and thermal budgets, ROS 2 QoS profiles, and observability for production deployments. The 'where do I run my code' chapter most courses skip."
  }
};

let updated = 0;
for (const [slug, hero] of Object.entries(HEROES)) {
  const file = path.join(dir, slug + '.json');
  if (!fs.existsSync(file)) { console.warn('skip', slug); continue; }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.hero) data.hero = {};
  data.hero.tagline = hero.tagline;
  data.hero.intro = hero.intro;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  updated++;
  console.log('✓', slug);
}

// Mirror taglines into index.json so home cards / sidebar match
const indexFile = path.join(dir, 'index.json');
const idx = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
for (const b of idx.branches) {
  const h = HEROES[b.slug];
  if (!h) continue;
  if (!b.hero) b.hero = {};
  b.hero.tagline = h.tagline;
  b.hero.intro = h.intro;
}
fs.writeFileSync(indexFile, JSON.stringify(idx, null, 2) + '\n', 'utf8');

console.log(`\nUpdated ${updated} branch hero intros + index.json mirror.`);
