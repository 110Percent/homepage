export interface InitWebglShaderBackgroundOptions {
    target: string | HTMLCanvasElement;
    vertexSource: string;
    fragmentSource: string;
    targetFps?: number;
    reducedMotionFps?: number;
    maxDpr?: number;
    reducedMotionMaxDpr?: number;
}

export interface WebglShaderBackgroundController {
    destroy: () => void;
}

function resolveCanvas(target: string | HTMLCanvasElement): HTMLCanvasElement {
    if (target instanceof HTMLCanvasElement) {
        return target;
    }

    const node = document.querySelector(target);
    if (!(node instanceof HTMLCanvasElement)) {
        throw new Error(`Shader canvas not found for target: ${target}`);
    }

    return node;
}

function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Could not create shader");

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info =
            gl.getShaderInfoLog(shader) || "Unknown shader compile error";
        gl.deleteShader(shader);
        throw new Error(info);
    }

    return shader;
}

function createProgram(
    gl: WebGLRenderingContext,
    vertexSource: string,
    fragmentSource: string
): WebGLProgram {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentSource
    );

    const program = gl.createProgram();
    if (!program) throw new Error("Could not create program");

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info =
            gl.getProgramInfoLog(program) || "Unknown program link error";
        gl.deleteProgram(program);
        throw new Error(info);
    }

    return program;
}

export function initWebglShaderBackground(
    options: InitWebglShaderBackgroundOptions
): WebglShaderBackgroundController {
    const {
        target,
        vertexSource,
        fragmentSource,
        targetFps = 60,
        reducedMotionFps = 12,
        maxDpr = 1.5,
        reducedMotionMaxDpr = 1
    } = options;
    const canvas = resolveCanvas(target);

    const glContext =
        canvas.getContext("webgl", {
            alpha: false,
            antialias: false,
            powerPreference: "low-power"
        }) ?? canvas.getContext("experimental-webgl");

    if (!(glContext instanceof WebGLRenderingContext)) {
        console.warn("WebGL not available");
        canvas.style.display = "none";
        return { destroy: () => {} };
    }

    const gl = glContext;
    const program = createProgram(gl, vertexSource, fragmentSource);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );
    const effectiveFps = prefersReducedMotion.matches
        ? reducedMotionFps
        : targetFps;
    const effectiveMaxDpr = prefersReducedMotion.matches
        ? reducedMotionMaxDpr
        : maxDpr;
    const frameInterval = 1000 / Math.max(1, effectiveFps);

    function resize(): void {
        const dpr = Math.min(window.devicePixelRatio || 1, effectiveMaxDpr);
        const width = Math.floor(canvas.clientWidth * dpr);
        const height = Math.floor(canvas.clientHeight * dpr);

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    let raf = 0;
    let running = false;
    let lastFrameTime = 0;
    const start = performance.now();

    function render(now: number): void {
        if (!running) {
            return;
        }

        if (now - lastFrameTime < frameInterval) {
            raf = requestAnimationFrame(render);
            return;
        }
        lastFrameTime = now;

        const time = (now - start) * 0.001;

        if (timeLocation) {
            gl.uniform1f(timeLocation, time);
        }
        if (resolutionLocation) {
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        raf = requestAnimationFrame(render);
    }

    function startRenderLoop(): void {
        if (running) {
            return;
        }
        running = true;
        lastFrameTime = 0;
        raf = requestAnimationFrame(render);
    }

    function stopRenderLoop(): void {
        running = false;
        cancelAnimationFrame(raf);
    }

    const onResize = () => resize();
    const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            startRenderLoop();
            return;
        }
        stopRenderLoop();
    };

    const intersectionObserver = new IntersectionObserver(
        (entries) => {
            const entry = entries[0];
            if (!entry) {
                return;
            }

            if (entry.isIntersecting) {
                startRenderLoop();
                return;
            }

            stopRenderLoop();
        },
        { threshold: 0.01 }
    );

    const resizeObserver = new ResizeObserver(() => resize());

    resize();
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    startRenderLoop();

    const destroy = () => {
        stopRenderLoop();
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };

    window.addEventListener("pagehide", destroy, { once: true });

    return { destroy };
}
