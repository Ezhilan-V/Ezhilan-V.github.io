import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LearnLayoutComponent } from './pages/learn-layout/learn-layout.component';
import { LearnHomeComponent } from './pages/learn-home/learn-home.component';
import { BranchPageComponent } from './pages/branch-page/branch-page.component';
import { VocabularyComponent } from './pages/vocabulary/vocabulary.component';
import { QuizComponent } from './pages/quiz/quiz.component';
import { PathsComponent } from './pages/paths/paths.component';

const routes: Routes = [
  {
    path: '',
    component: LearnLayoutComponent,
    children: [
      { path: '',           component: LearnHomeComponent,   title: 'Overview' },
      { path: 'vocabulary', component: VocabularyComponent,  title: 'Vocabulary' },
      { path: 'quiz',       component: QuizComponent,        title: 'Test Your Knowledge' },
      { path: 'paths',      component: PathsComponent,       title: 'Learning Paths' },
      { path: ':slug',      component: BranchPageComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LearnRoutingModule {}
