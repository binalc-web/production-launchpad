import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "../ui/utils";
import { ConnectionHandle, ConnectionState } from "./ConnectionHandle";
import { LucideIcon } from "lucide-react";

export type NodeVariant = 'trigger' | 'action' | 'transformation';
export type NodeState = 'default' | 'hover' | 'selected' | 'dragging';

interface NodeConnection {
  id: string;
  label?: string;
  state?: ConnectionState;
}

interface NodeProps {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon | string;
  variant: NodeVariant;
  state?: NodeState;
  position: { x: number; y: number };
  inputs?: NodeConnection[];
  outputs?: NodeConnection[];
  disabled?: boolean;
  className?: string;
  onDrag?: (position: { x: number; y: number }) => void;
  onSelect?: () => void;
  onConnectionClick?: (connectionId: string, type: 'input' | 'output') => void;
  children?: ReactNode;
}

export function Node({
  id,
  title,
  description,
  icon: IconComponent,
  variant,
  state = 'default',
  position,
  inputs = [],
  outputs = [],
  disabled = false,
  className,
  onDrag,
  onSelect,
  onConnectionClick,
  children
}: NodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const getVariantStyles = () => {
    const variants = {
      trigger: {
        border: "border-green-500/30",
        background: "bg-green-50 dark:bg-green-950/20",
        icon: "text-green-600 dark:text-green-400",
        accent: "bg-green-500"
      },
      action: {
        border: "border-blue-500/30",
        background: "bg-blue-50 dark:bg-blue-950/20",
        icon: "text-blue-600 dark:text-blue-400",
        accent: "bg-blue-500"
      },
      transformation: {
        border: "border-orange-500/30",
        background: "bg-orange-50 dark:bg-orange-950/20",
        icon: "text-orange-600 dark:text-orange-400",
        accent: "bg-orange-500"
      }
    };
    return variants[variant];
  };

  const getStateStyles = () => {
    const states = {
      default: "shadow-sm",
      hover: "shadow-md scale-105",
      selected: "shadow-lg ring-2 ring-primary ring-offset-2",
      dragging: "shadow-xl scale-105 rotate-1"
    };
    return states[state];
  };

  const variantStyles = getVariantStyles();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    
    onSelect?.();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onSelect?.();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || disabled) return;
      
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      
      onDrag?.(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, onDrag, disabled]);

  const currentState = isDragging ? 'dragging' : state;

  return (
    <div
      ref={nodeRef}
      className={cn(
        "absolute select-none transition-all duration-200 cursor-pointer",
        disabled && "cursor-not-allowed opacity-50"
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: currentState === 'dragging' ? 'rotate(1deg)' : 'none'
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Main Node Card */}
      <div
        className={cn(
          "relative w-64 min-h-20 rounded-lg border-2 transition-all duration-200",
          variantStyles.border,
          variantStyles.background,
          getStateStyles(),
          disabled && "grayscale",
          className
        )}
      >
        {/* Accent bar */}
        <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-md", variantStyles.accent)} />

        {/* Node Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
              variantStyles.background,
              "border border-current/20"
            )}>
              {typeof IconComponent === 'string' ? (
                <span className={cn("text-lg", variantStyles.icon)}>{IconComponent}</span>
              ) : (
                <IconComponent className={cn("w-4 h-4", variantStyles.icon)} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{title}</h4>
              {description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
              )}
              {children}
            </div>
          </div>
        </div>

        {/* Input Connections */}
        {inputs.map((input, index) => (
          <ConnectionHandle
            key={`input-${input.id}`}
            type="input"
            position="left"
            state={input.state}
            label={input.label}
            onConnect={() => onConnectionClick?.(input.id, 'input')}
            className="top-6"
            style={{ top: `${24 + (index * 16)}px` }}
          />
        ))}

        {/* Output Connections */}
        {outputs.map((output, index) => (
          <ConnectionHandle
            key={`output-${output.id}`}
            type="output"
            position="right"
            state={output.state}
            label={output.label}
            onConnect={() => onConnectionClick?.(output.id, 'output')}
            className="top-6"
            style={{ top: `${24 + (index * 16)}px` }}
          />
        ))}

        {/* Selection indicator */}
        {state === 'selected' && (
          <div className="absolute -inset-1 border-2 border-primary rounded-lg pointer-events-none opacity-50" />
        )}
      </div>
    </div>
  );
}