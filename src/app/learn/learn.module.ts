import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LearnRoutingModule } from './learn-routing.module';

import { LearnLayoutComponent } from './pages/learn-layout/learn-layout.component';
import { LearnHomeComponent } from './pages/learn-home/learn-home.component';
import { BranchPageComponent } from './pages/branch-page/branch-page.component';
import { VocabularyComponent } from './pages/vocabulary/vocabulary.component';
import { QuizComponent } from './pages/quiz/quiz.component';
import { PathsComponent } from './pages/paths/paths.component';

import { CodeBlockComponent } from './components/code-block/code-block.component';
import { BranchesDiagramComponent } from './components/branches-diagram/branches-diagram.component';
import { PathCanvasComponent } from './components/path-canvas/path-canvas.component';
import { RobotLoopComponent } from './components/robot-loop/robot-loop.component';
import { KinematicsViewerComponent } from './components/kinematics-viewer/kinematics-viewer.component';
import { PinholeCameraComponent } from './components/widgets/pinhole-camera/pinhole-camera.component';
import { DiffDriveComponent } from './components/widgets/diff-drive/diff-drive.component';
import { AstarComponent } from './components/widgets/astar/astar.component';
import { PidControllerComponent } from './components/widgets/pid-controller/pid-controller.component';
import { Kalman1dComponent } from './components/widgets/kalman-1d/kalman-1d.component';
import { ParticleFilterComponent } from './components/widgets/particle-filter/particle-filter.component';
import { OccupancySlamComponent } from './components/widgets/occupancy-slam/occupancy-slam.component';
import { RrtComponent } from './components/widgets/rrt/rrt.component';
import { QuadrupedGaitComponent } from './components/widgets/quadruped-gait/quadruped-gait.component';
import { BoidsComponent } from './components/widgets/boids/boids.component';
import { InverseKinematicsComponent } from './components/widgets/inverse-kinematics/inverse-kinematics.component';
import { CostmapInflationComponent } from './components/widgets/costmap-inflation/costmap-inflation.component';
import { ConvolutionComponent } from './components/widgets/convolution/convolution.component';
import { QLearningComponent } from './components/widgets/qlearning/qlearning.component';
import { Rotation3dComponent } from './components/widgets/rotation3d/rotation3d.component';
import { FrenetSamplerComponent } from './components/widgets/frenet-sampler/frenet-sampler.component';
import { MotorMixerComponent } from './components/widgets/motor-mixer/motor-mixer.component';
import { BayesFilterComponent } from './components/widgets/bayes-filter/bayes-filter.component';
import { LinearAlgebraComponent } from './components/widgets/linear-algebra/linear-algebra.component';
import { MpcHorizonComponent } from './components/widgets/mpc-horizon/mpc-horizon.component';
import { WorkspaceCloudComponent } from './components/widgets/workspace-cloud/workspace-cloud.component';
import { RtJitterComponent } from './components/widgets/rt-jitter/rt-jitter.component';
import { OpticalFlowComponent } from './components/widgets/optical-flow/optical-flow.component';
import { RlCurveComponent } from './components/widgets/rl-curve/rl-curve.component';
import { PurePursuitComponent } from './components/widgets/pure-pursuit/pure-pursuit.component';
import { IcpComponent } from './components/widgets/icp/icp.component';
import { ManipulabilityComponent } from './components/widgets/manipulability/manipulability.component';
import { ForceClosureComponent } from './components/widgets/force-closure/force-closure.component';
import { CascadePidComponent } from './components/widgets/cascade-pid/cascade-pid.component';
import { StereoDisparityComponent } from './components/widgets/stereo-disparity/stereo-disparity.component';
import { LoopClosureComponent } from './components/widgets/loop-closure/loop-closure.component';
import { RosPubsubComponent } from './components/widgets/ros-pubsub/ros-pubsub.component';
import { BehaviorTreeComponent } from './components/widgets/behavior-tree/behavior-tree.component';
import { TfTreeComponent } from './components/widgets/tf-tree/tf-tree.component';

import { WidgetShellComponent } from './components/widget-kit/widget-shell.component';
import { LearnSliderComponent } from './components/widget-kit/learn-slider.component';
import { LearnPresetsComponent } from './components/widget-kit/learn-presets.component';
import { LearnCalloutComponent } from './components/widget-kit/learn-callout.component';
import { PageHeroComponent } from './components/widget-kit/page-hero.component';
import { SearchInputComponent } from './components/widget-kit/search-input.component';
import { LearnTermDirective } from './components/learn-term/learn-term.directive';
import { LearnSearchBarComponent } from './components/search-bar/search-bar.component';

@NgModule({
  imports: [CommonModule, FormsModule, LearnRoutingModule],
  declarations: [
    LearnLayoutComponent,
    LearnHomeComponent,
    BranchPageComponent,
    VocabularyComponent,
    QuizComponent,
    PathsComponent,
    CodeBlockComponent,
    BranchesDiagramComponent,
    PathCanvasComponent,
    RobotLoopComponent,
    KinematicsViewerComponent,
    PinholeCameraComponent,
    DiffDriveComponent,
    AstarComponent,
    PidControllerComponent,
    Kalman1dComponent,
    ParticleFilterComponent,
    OccupancySlamComponent,
    RrtComponent,
    QuadrupedGaitComponent,
    BoidsComponent,
    InverseKinematicsComponent,
    CostmapInflationComponent,
    ConvolutionComponent,
    QLearningComponent,
    Rotation3dComponent,
    FrenetSamplerComponent,
    MotorMixerComponent,
    BayesFilterComponent,
    LinearAlgebraComponent,
    MpcHorizonComponent,
    WorkspaceCloudComponent,
    RtJitterComponent,
    OpticalFlowComponent,
    RlCurveComponent,
    PurePursuitComponent,
    IcpComponent,
    ManipulabilityComponent,
    ForceClosureComponent,
    CascadePidComponent,
    StereoDisparityComponent,
    LoopClosureComponent,
    RosPubsubComponent,
    BehaviorTreeComponent,
    TfTreeComponent,
    WidgetShellComponent,
    LearnSliderComponent,
    LearnPresetsComponent,
    LearnCalloutComponent,
    PageHeroComponent,
    SearchInputComponent,
    LearnTermDirective,
    LearnSearchBarComponent
  ]
})
export class LearnModule {}
