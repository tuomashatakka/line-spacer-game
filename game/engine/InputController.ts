
import { Emitter } from 'event-kit'


export class InputController {
    
    private emitter = new Emitter()
    private pointers = new Map<number, { id: number, startX: number, startY: number, lastX: number, lastY: number, isDragging: boolean }>()
    private multiTouchState = { isMulti: false, lastDist: 0 }
    private hadMultiTouch = false;


    constructor(private mount: HTMLElement) {
        document.addEventListener('keydown', this.onKeyDown)
        this.mount.addEventListener('pointerdown', this.onPointerDown)
        this.mount.addEventListener('pointermove', this.onPointerMove)
        this.mount.addEventListener('pointerup', this.onPointerUp)
        this.mount.addEventListener('pointerleave', this.onPointerUp)
        this.mount.addEventListener('wheel', this.onWheel, { passive: false })
        window.addEventListener('tron_debug_select', this.onDebugSelect)
    }

    private onDebugSelect = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (typeof detail === 'string') {
            this.emitter.emit('debug_select', detail);
        }
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'h') return // Let App handle help toggle

        if (e.code === 'Space') {
            e.preventDefault()
            this.emitter.emit('primary_action')
            return
        }

        if (e.code === 'Backspace') {
            e.preventDefault()
            this.emitter.emit('undo')
            return
        }
        
        const orbitSpeed = 2;
        if (!e.repeat) {
            switch (e.key.toLowerCase()) {
                case 'z': this.emitter.emit('zoom', -0.5); break
                case 'x': this.emitter.emit('zoom', 0.5); break
                case 'q': this.emitter.emit('orbit', { dx: -orbitSpeed, dy: 0 }); break
                case 'e': this.emitter.emit('orbit', { dx: orbitSpeed, dy: 0 }); break
            }
        }
    }
    
    private onPointerDown = (e: PointerEvent) => {
        if (e.target instanceof HTMLElement) {
             e.target.setPointerCapture(e.pointerId);
        }

        this.pointers.set(e.pointerId, { id: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, isDragging: false })
        
        if (this.pointers.size >= 2) {
            this.hadMultiTouch = true
            this.multiTouchState.isMulti = true
            const [p1, p2] = Array.from(this.pointers.values())
            const dx = p1.lastX - p2.lastX
            const dy = p1.lastY - p2.lastY
            this.multiTouchState.lastDist = Math.sqrt(dx * dx + dy * dy)
        }
    }

    private onPointerMove = (e: PointerEvent) => {
        if (!this.pointers.has(e.pointerId)) return;
        const pointerState = this.pointers.get(e.pointerId)!;
        
        const dx = e.clientX - pointerState.lastX;
        const dy = e.clientY - pointerState.lastY;
        
        pointerState.lastX = e.clientX;
        pointerState.lastY = e.clientY;

        const moveDistSq = (e.clientX - pointerState.startX)**2 + (e.clientY - pointerState.startY)**2
        if (!pointerState.isDragging && moveDistSq > 10 * 10) { 
            pointerState.isDragging = true
        }

        if (this.pointers.size === 1 && pointerState.isDragging) {
             this.emitter.emit('orbit', { dx, dy });
             return;
        }

        if (this.pointers.size === 2) {
            const pointersArr = Array.from(this.pointers.values())
            const p1 = pointersArr[0];
            const p2 = pointersArr[1];
            
            // Only zoom when pinch-zooming; do not orbit to avoid wild spins.
            const dist_dx = p1.lastX - p2.lastX
            const dist_dy = p1.lastY - p2.lastY
            const dist = Math.sqrt(dist_dx * dist_dx + dist_dy * dist_dy)
            const zoomDelta = this.multiTouchState.lastDist - dist
            this.emitter.emit('zoom', zoomDelta * 0.015)
            this.multiTouchState.lastDist = dist
        }
    }
    
    private onPointerUp = (e: PointerEvent) => {
        const pointerState = this.pointers.get(e.pointerId)
        if (!pointerState) return

        if (!pointerState.isDragging && !this.hadMultiTouch) {
            const x = (e.clientX / this.mount.clientWidth) * 2 - 1;
            const y = -(e.clientY / this.mount.clientHeight) * 2 + 1;
            this.emitter.emit('tap_input', { x, y });
        }
        
        this.pointers.delete(e.pointerId)
        if (this.pointers.size === 0) {
            this.hadMultiTouch = false
        }
        if (this.pointers.size < 2) {
            this.multiTouchState.isMulti = false
        }
    }
    
    private onWheel = (e: WheelEvent) => {
        e.preventDefault();
        // Positive e.deltaY means scroll down (zoom out).
        const scrollAmount = e.deltaY * 0.005;
        this.emitter.emit('zoom', scrollAmount);
    }

    public getEmitter = () => this.emitter

    public destroy() {
        document.removeEventListener('keydown', this.onKeyDown)
        this.mount.removeEventListener('pointerdown', this.onPointerDown)
        this.mount.removeEventListener('pointermove', this.onPointerMove)
        this.mount.removeEventListener('pointerup', this.onPointerUp)
        this.mount.removeEventListener('pointerleave', this.onPointerUp)
        this.mount.removeEventListener('wheel', this.onWheel)
        window.removeEventListener('tron_debug_select', this.onDebugSelect);
        this.emitter.dispose()
    }
}
