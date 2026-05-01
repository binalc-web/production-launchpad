import { cn } from "../ui/utils";

export type ConnectionState = 'default' | 'hover' | 'active' | 'connected';
export type ConnectionType = 'input' | 'output';

interface ConnectionHandleProps {
  type: ConnectionType;
  state?: ConnectionState;
  position: 'left' | 'right';
  label?: string;
  onConnect?: () => void;
  onHover?: (isHovering: boolean) => void;
  className?: string;
}

export function ConnectionHandle({ 
  type, 
  state = 'default', 
  position, 
  label,
  onConnect,
  onHover,
  className 
}: ConnectionHandleProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnect?.();
  };

  const handleMouseEnter = () => {
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    onHover?.(false);
  };

  const getHandleClasses = () => {
    const baseClasses = "absolute w-3 h-3 rounded-full border-2 cursor-pointer transition-all duration-200 z-10";
    
    const positionClasses = {
      left: "-left-1.5 top-1/2 -translate-y-1/2",
      right: "-right-1.5 top-1/2 -translate-y-1/2"
    };

    const stateClasses = {
      default: "border-border bg-background hover:border-primary hover:bg-primary/10 hover:scale-110",
      hover: "border-primary bg-primary/10 scale-110",
      active: "border-primary bg-primary scale-125 shadow-lg shadow-primary/25",
      connected: "border-primary bg-primary shadow-md"
    };

    return cn(
      baseClasses,
      positionClasses[position],
      stateClasses[state],
      className
    );
  };

  return (
    <div className="relative group">
      <div
        className={getHandleClasses()}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Inner dot for connected state */}
        {state === 'connected' && (
          <div className="absolute inset-1 rounded-full bg-background" />
        )}
      </div>

      {/* Connection label tooltip */}
      {label && (
        <div 
          className={cn(
            "absolute -top-8 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20",
            position === 'left' ? "left-0" : "right-0"
          )}
        >
          {label}
          <div 
            className={cn(
              "absolute top-full w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-popover",
              position === 'left' ? "left-2" : "right-2"
            )}
          />
        </div>
      )}
    </div>
  );
}