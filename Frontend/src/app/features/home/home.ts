import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { ProfileComponent } from './profile/profile';

interface Star3D {
  x: number;
  y: number;
  z: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ProfileComponent, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HOME implements AfterViewInit, OnDestroy {
  @ViewChild('wormholeCanvas', { static: false })
  wormholeCanvas!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private resizeHandler?: () => void;
  private t = 0; // الزمن للأنيميشن

  private stars: Star3D[] = [];
  private universeReady = false;

  ngAfterViewInit(): void {
    const canvas = this.wormholeCanvas?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    // توليد "الكون" مرة واحدة
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
  }

  // توليد النجوم مرة واحدة
  private createUniverse(): void {
    this.stars = [];
    const starCount = 420;

    for (let i = 0; i < starCount; i++) {
      // توزيع النجوم في "هالة" حول الأصل
      const r = 0.8 + Math.random() * 3.2; // 0.8..4
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1); // توزيع كروي

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.stars.push({ x, y, z });
    }

    this.universeReady = true;
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.t += 0.01; // سرعة دوران المشهد
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

    const axisColor = '#01291f';
    const gold = '#f5c96a';

    const R = Math.min(width, height) * 0.42;
    const unit = R / 4;

    // دوران للمشهد ككل (حول Y و X)
    const rotY = this.t * 0.2;
    const rotX = Math.sin(this.t * 0.2) * 0.2;

    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);

    const cameraDist = 6; // كلما زاد، صار العمق أقل
    const project = (x: number, y: number, z: number) => {
      // دوران حول Y
      let x1 = x * cosY - z * sinY;
      let z1 = x * sinY + z * cosY;
      // دوران حول X
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

    // "تنفّس" بسيط للمشهد (تكبير/تصغير)
    const pulse = 0.96 + 0.04 * Math.sin(this.t * 0.6);
    ctx.scale(pulse, pulse);

    // ===== قرص مجرّة (شبكة دائرية على مستوى XY) =====
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 0.5;

    const diskRings = 5;
    for (let i = 1; i <= diskRings; i++) {
      const rr = (i / diskRings) * 3;
      const steps = 120;
      ctx.beginPath();
      for (let j = 0; j <= steps; j++) {
        const a = (j / steps) * Math.PI * 2;
        const x = rr * Math.cos(a);
        const y = rr * Math.sin(a);
        const z = 0;
        const p = project(x, y, z);
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // محاور صغيرة داخل القرص (شبكة شعاعية)
    const radialLines = 12;
    for (let i = 0; i < radialLines; i++) {
      const a = (i / radialLines) * Math.PI * 2;
      const x1 = 0;
      const y1 = 0;
      const z1 = 0;
      const x2 = 3.2 * Math.cos(a);
      const y2 = 3.2 * Math.sin(a);
      const z2 = 0;

      const p1 = project(x1, y1, z1);
      const p2 = project(x2, y2, z2);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // ===== محاور الإحداثيات 3D =====
    ctx.lineWidth = 1.2;

    // محور X (ذهبي)
    ctx.strokeStyle = gold;
    let p1 = project(-4.5, 0, 0);
    let p2 = project(4.5, 0, 0);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // سهم X+
    const xArrowBase = project(4.5, 0, 0);
    const xArrow1 = project(4.0, 0.15, 0);
    const xArrow2 = project(4.0, -0.15, 0);
    ctx.beginPath();
    ctx.moveTo(xArrowBase.x, xArrowBase.y);
    ctx.lineTo(xArrow1.x, xArrow1.y);
    ctx.moveTo(xArrowBase.x, xArrowBase.y);
    ctx.lineTo(xArrow2.x, xArrow2.y);
    ctx.stroke();

    // محور Y
    ctx.strokeStyle = axisColor;
    p1 = project(0, -4.0, 0);
    p2 = project(0, 4.0, 0);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // محور Z
    p1 = project(0, 0, -4.0);
    p2 = project(0, 0, 4.0);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // ===== مدارات (Orbits) مائلة حول المركز =====
    ctx.strokeStyle = gold;
    ctx.lineWidth = 0.8;

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
        // دائرة في مستوى XY، ثم نميلها يدوياً
        let x = cfg.r * Math.cos(a);
        let y = cfg.r * Math.sin(a);
        let z = 0;

        // ميلان يدوي للأوربت
        const cosTx = Math.cos(cfg.tiltX);
        const sinTx = Math.sin(cfg.tiltX);
        const cosTy = Math.cos(cfg.tiltY);
        const sinTy = Math.sin(cfg.tiltY);

        // دوران حول X
        let yx = y * cosTx - z * sinTx;
        let zx = y * sinTx + z * cosTx;
        // دوران حول Y
        let xy = x * cosTy - zx * sinTy;
        let zy = x * sinTy + zx * cosTy;

        const p = project(xy, yx, zy);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // جسم صغير يدور على كل مدار
      const phase = this.t * 0.5 + index * 1.2;
      let x = cfg.r * Math.cos(phase);
      let y = cfg.r * Math.sin(phase);
      let z = 0;

      const cosTx = Math.cos(cfg.tiltX);
      const sinTx = Math.sin(cfg.tiltX);
      const cosTy = Math.cos(cfg.tiltY);
      const sinTy = Math.sin(cfg.tiltY);

      let yx = y * cosTx - z * sinTx;
      let zx = y * sinTx + z * cosTx;
      let xy = x * cosTy - zx * sinTy;
      let zy = x * sinTy + zx * cosTy;

      const pp = project(xy, yx, zy);
      ctx.beginPath();
      const rDot = 2 + 1.5 * pp.scale;
      ctx.arc(pp.x, pp.y, rDot, 0, Math.PI * 2);
      ctx.fillStyle = gold;
      ctx.fill();
    });

    // ===== نجوم =====
    // نرسم النجوم بعد المحاور حتى تغطي الخلفية فقط
    ctx.fillStyle = gold;
    for (const s of this.stars) {
      const p = project(s.x, s.y, s.z);
      const alpha = 0.15 + 0.6 * p.scale; // كلما كان أقرب، كان أسطع
      const radius = 0.8 + 1.4 * p.scale;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ===== نواة المجرة في المركز =====
    const core = project(0, 0, 0);
    const coreRadius = 4;
    const grad = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, coreRadius * 3);
    grad.addColorStop(0, gold + 'aa');
    grad.addColorStop(1, gold + '00');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(core.x, core.y, coreRadius * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
