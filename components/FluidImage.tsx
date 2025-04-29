import { View } from "react-native";
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  useClock,
  Image,
  Blur,
  interpolate,
  SkImage,
  RoundedRect,
  Paint,
  rrect,
  rect,
  Group,
  point,
  interpolateColors,
} from "@shopify/react-native-skia";
import {
  useDerivedValue,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { FC, useEffect, useRef, useState } from "react";

const isNil = (value: any) => value === null || value === undefined;

/**
 * SkSL shader – compiled at runtime with Skia.RuntimeEffect
 *
 * iTime        – seconds since mount (injected by useClockValue)
 * iResolution  – screen size so the shader is DPI-aware
 *
 * The noise() helper is a 2-D classic Perlin implementation.
 * Feel free to tweak the uv*4.0 scale or time multipliers
 * to make the animation faster, slower, or more/less "blobby".
 */
const perlinEffect = Skia.RuntimeEffect.Make(/* wgsl/glsl */ `
  uniform float iTime;
  uniform float2 iResolution;

  half rand(float2 n) {
    return fract(sin(dot(n, float2(12.9898, 78.233))) * 43758.5453);
  }

  half noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    half n00 = rand(i);
    half n10 = rand(i + float2(1.0, 0.0));
    half n01 = rand(i + float2(0.0, 1.0));
    half n11 = rand(i + float2(1.0, 1.0));

    half nx0 = mix(n00, n10, f.x);
    half nx1 = mix(n01, n11, f.x);
    return mix(nx0, nx1, f.y);
  }

  half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution;        // 0-1 space
    half n = noise(uv * 4.0 + iTime * 0.2);     // scale + animate
    return half4(n, n, n, 1.0);                 // grayscale output
  }`)!;

interface FluidImageProps {
  skiaImage?: SkImage | null;
  width: number;
  height: number;
  displayFluidSimulation?: boolean;
  loadingImage?: boolean;
  children?: React.ReactNode;
  radius: number;
}

export const FluidImage: FC<FluidImageProps> = ({
  skiaImage,
  width,
  height,
  displayFluidSimulation = false,
  loadingImage,
  children,
  radius,
}) => {
  const time = useClock();
  const [displaySkiaImage, setDisplaySkiaImage] = useState<
    SkImage | null | undefined
  >(skiaImage);
  const animatedLoading = useDerivedValue(() => {
    return displayFluidSimulation
      ? withTiming(1, { duration: 1000 })
      : withDelay(0, withTiming(0, { duration: 1000 }));
  }, [displayFluidSimulation]);
  const transition = useDerivedValue(() => {
    return withTiming(loadingImage ? 1 : 0, { duration: 300 });
  }, [loadingImage]);

  const currentImageOpacity = useDerivedValue(() => {
    return 1 - transition.value;
  }, []);

  // Animation cycle length in seconds
  const CYCLE_DURATION = 60;

  const uniforms = useDerivedValue(() => {
    // Convert milliseconds to seconds
    const seconds = time.value / 250;

    // Create a triangular wave pattern that smoothly goes up then down
    // Complete cycle is 2*CYCLE_DURATION (up and down)
    const fullPeriod = CYCLE_DURATION * 2;
    const normalizedTime = (seconds % fullPeriod) / fullPeriod;

    // First half of cycle: time goes up from 0 to CYCLE_DURATION
    // Second half: time goes down from CYCLE_DURATION to 0
    const loopedTime =
      normalizedTime < 0.5
        ? normalizedTime * 2 * CYCLE_DURATION
        : (1 - normalizedTime) * 2 * CYCLE_DURATION;

    return {
      iTime: loopedTime,
      iResolution: [width, height],
    };
  }, [width, height]);

  // Convert Reanimated shared value to Skia-compatible values
  const blurValue = useDerivedValue(() => {
    return interpolate(animatedLoading.value, [0, 1], [0, 10]);
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isNil(skiaImage) && !isNil(displaySkiaImage)) {
      timeoutRef.current = setTimeout(() => {
        setDisplaySkiaImage(null);
      }, 300);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setDisplaySkiaImage(skiaImage);
    }
  }, [skiaImage]);

  const borderWidth = 3;

  const roundedRect = rrect(
    rect(
      borderWidth,
      borderWidth,
      width - borderWidth * 2,
      height - borderWidth * 2
    ),
    radius - borderWidth,
    radius - borderWidth
  );

  const borderColor = useDerivedValue(() => {
    return interpolateColors(animatedLoading.value, [0, 1], ["black", "white"]);
  });

  return (
    <View style={{ width, height, borderRadius: radius, overflow: "hidden" }}>
      <Canvas
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          zIndex: -1,
          backgroundColor: "#F6F6F6",
        }}
      >
        {displaySkiaImage && (
          <>
            <RoundedRect
              x={0}
              y={0}
              width={width}
              height={height}
              r={radius}
              style="stroke"
              strokeWidth={borderWidth}
              color={borderColor}
            />
            <Group clip={roundedRect}>
              <Image
                x={borderWidth}
                y={borderWidth}
                width={width - borderWidth * 2}
                height={height - borderWidth * 2}
                image={displaySkiaImage}
                fit="contain"
                opacity={currentImageOpacity}
              >
                <Blur blur={blurValue} />
              </Image>
            </Group>
          </>
        )}

        <Fill opacity={animatedLoading}>
          <Shader source={perlinEffect} uniforms={uniforms} />
        </Fill>
      </Canvas>
      {children}
    </View>
  );
};
