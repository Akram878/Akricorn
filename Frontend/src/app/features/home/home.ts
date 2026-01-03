import { Component, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicCourse, PublicCoursesService } from '../../core/services/public-courses.service';
import { AuthService } from '../../core/services/auth.service';

import { CourseCardComponent } from '../lms/course-card/course-card';

interface Star3D {
  x: number;
  y: number;
  z: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CourseCardComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HOME implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('wormholeCanvas', { static: false })
  wormholeCanvas!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private resizeHandler?: () => void;
  private t = 0; // Time for the animation

  private stars: Star3D[] = [];
  private universeReady = false;

  featuredCourses: PublicCourse[] = [];
  private ownedCourseIds: Set<number> = new Set<number>();
  private authSubscription?: Subscription;
  constructor(
    private publicCoursesService: PublicCoursesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadFeaturedCourses();
    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.loadMyCourses();
      } else {
        this.ownedCourseIds.clear();
      }
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.wormholeCanvas?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    // Generate the "universe" once
    this.createUniverse();

    this.resizeHandler = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawFrame();
    };

    window.addEventListener('resize', this.resizeHandler);
    this.resizeHandler();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.authSubscription?.unsubscribe();
  }

  trackByCourseId(index: number, course: PublicCourse): number {
    return course.id;
  }

  isCourseOwned(course: PublicCourse): boolean {
    return this.ownedCourseIds.has(course.id);
  }

  onCoursePurchased(courseId: number): void {
    this.ownedCourseIds.add(courseId);
  }

  private loadFeaturedCourses(): void {
    this.publicCoursesService.getFeaturedCourses().subscribe({
      next: (courses) => {
        this.featuredCourses = [...courses]
          .sort((a, b) => this.getCourseTimestamp(b) - this.getCourseTimestamp(a))
          .slice(0, 5);
      },
      error: () => {
        this.featuredCourses = [];
      },
    });
  }

  private getCourseTimestamp(course: PublicCourse): number {
    if (!course.createdAt) {
      return 0;
    }
    const timestamp = new Date(course.createdAt).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private loadMyCourses(): void {
    if (!this.authService.isAuthenticated()) {
      this.ownedCourseIds.clear();
      return;
    }

    this.publicCoursesService.getMyCourses().subscribe({
      next: (courses) => {
        this.ownedCourseIds = new Set(courses.map((course) => course.id));
      },
      error: () => {
        this.ownedCourseIds.clear();
      },
    });
  }

  // Generate the stars once
  private createUniverse(): void {
    this.stars = [];
    const starCount = 420;

    for (let i = 0; i < starCount; i++) {
      const r = 0.8 + Math.random() * 3.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.stars.push({ x, y, z });
    }

    this.universeReady = true;
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.t += 0.01;
    this.drawFrame();
  };

  private drawFrame(): void {
    if (!this.ctx || !this.wormholeCanvas || !this.universeReady) return;

    const canvas = this.wormholeCanvas.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);

    /* 🎨 Adjusted colors to suit the sky */
    const axisColor = 'rgba(120, 170, 210, 0.45)'; // Calm sky blue
    const gold = '#D9A74A'; // Deeper, clearer gold

    const R = Math.min(width, height) * 0.42;
    const unit = R / 4;

    const rotY = this.t * 0.2;
    const rotX = Math.sin(this.t * 0.2) * 0.2;

    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);

    const cameraDist = 6;
    const project = (x: number, y: number, z: number) => {
      let x1 = x * cosY - z * sinY;
      let z1 = x * sinY + z * cosY;
      let y1 = y * cosX - z1 * sinX;
      let z2 = y * sinX + z1 * cosX;

      const perspective = cameraDist / (cameraDist + z2);
      return {
        x: x1 * unit * perspective,
        y: y1 * unit * perspective,
        depth: z2,
        scale: perspective,
      };
    };

    const pulse = 0.96 + 0.04 * Math.sin(this.t * 0.6);
    ctx.scale(pulse, pulse);

    /* ===== Galactic disk ===== */
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 0.8;

    const diskRings = 5;
    for (let i = 1; i <= diskRings; i++) {
      const rr = (i / diskRings) * 3;
      const steps = 120;
      ctx.beginPath();
      for (let j = 0; j <= steps; j++) {
        const a = (j / steps) * Math.PI * 2;
        const p = project(rr * Math.cos(a), rr * Math.sin(a), 0);
        j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    /* ===== Radial grid ===== */
    const radialLines = 12;
    for (let i = 0; i < radialLines; i++) {
      const a = (i / radialLines) * Math.PI * 2;
      const p1 = project(0, 0, 0);
      const p2 = project(3.2 * Math.cos(a), 3.2 * Math.sin(a), 0);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    /* ===== Coordinate axes ===== */
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = gold;

    let p1 = project(-4.5, 0, 0);
    let p2 = project(4.5, 0, 0);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.2;

    p1 = project(0, -4.0, 0);
    p2 = project(0, 4.0, 0);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    p1 = project(0, 0, -4.0);
    p2 = project(0, 0, 4.0);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    /* ===== Orbits ===== */
    ctx.strokeStyle = gold;
    ctx.lineWidth = 0.9;

    const orbitConfigs = [
      { r: 1.4, tiltX: 0.4, tiltY: 0.0 },
      { r: 2.1, tiltX: -0.3, tiltY: 0.5 },
      { r: 2.8, tiltX: 0.2, tiltY: -0.6 },
    ];

    orbitConfigs.forEach((cfg, index) => {
      const steps = 150;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        let x = cfg.r * Math.cos(a);
        let y = cfg.r * Math.sin(a);
        let z = 0;

        const cosTx = Math.cos(cfg.tiltX);
        const sinTx = Math.sin(cfg.tiltX);
        const cosTy = Math.cos(cfg.tiltY);
        const sinTy = Math.sin(cfg.tiltY);

        let yx = y * cosTx - z * sinTx;
        let zx = y * sinTx + z * cosTx;
        let xy = x * cosTy - zx * sinTy;
        let zy = x * sinTy + zx * cosTy;

        const p = project(xy, yx, zy);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      const phase = this.t * 0.5 + index * 1.2;
      const pp = project(cfg.r * Math.cos(phase), cfg.r * Math.sin(phase), 0);

      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 2.6 + 1.8 * pp.scale, 0, Math.PI * 2);
      ctx.fillStyle = gold;
      ctx.fill();
    });

    /* ===== Stars ===== */
    ctx.fillStyle = gold;
    for (const s of this.stars) {
      const p = project(s.x, s.y, s.z);
      const alpha = 0.25 + 0.75 * p.scale;
      const radius = 1.1 + 1.8 * p.scale;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* ===== Galactic core ===== */
    const core = project(0, 0, 0);
    const grad = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, 14);
    grad.addColorStop(0, 'rgba(217,167,74,0.55)');
    grad.addColorStop(1, 'rgba(217,167,74,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
