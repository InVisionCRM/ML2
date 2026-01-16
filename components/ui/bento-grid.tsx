import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-3xl grid-cols-1 gap-1 md:grid-cols-[1fr_1fr] md:grid-template-rows: 75% 25%",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  onClick,
  children,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "group/bento shadow-input flex flex-col justify-between space-y-4 rounded-lg border border-neutral-200 bg-gradient-to-br from-slate-900 to-black/20 backdrop-blur-sm p-4 dark:border-white/[0.2] dark:shadow-none",
        onClick && "cursor-pointer hover:scale-105",
        className,
      )}
      onClick={onClick}
    >
      {header}
      <div>
        {icon}
        <div className="mt-1 mb-0.5 font-poppins font-bold text-white dark:text-white text-center">
          {title}
        </div>
        <div className="font-poppins text-xs font-normal text-white dark:text-white text-center">
          {description}
        </div>
        {children}
      </div>
    </div>
  );
};
