
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useDayPicker, useNavigation } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium hidden", // Hide default label
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Caption: CustomCaption,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

function CustomCaption(props: React.ComponentProps<typeof DayPicker>['components']['Caption']) {
    const { goToMonth, nextMonth, previousMonth } = useNavigation();
    const { fromYear, toYear, fromMonth, toMonth, fromDate, toDate } = useDayPicker();

    const [isMonthPopoverOpen, setMonthPopoverOpen] = React.useState(false);
    const [isYearPopoverOpen, setYearPopoverOpen] = React.useState(false);
    
    const currentMonth = props.displayMonth;

    const handleMonthSelect = (month: number) => {
        goToMonth(new Date(currentMonth.getFullYear(), month));
        setMonthPopoverOpen(false);
    }
    
    const handleYearSelect = (year: number) => {
        goToMonth(new Date(year, currentMonth.getMonth()));
        setYearPopoverOpen(false);
    }

    const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1));
    
    const startYear = fromYear || (fromDate?.getFullYear()) || new Date().getFullYear() - 11;
    const endYear = toYear || (toDate?.getFullYear()) || new Date().getFullYear() + 12;
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    
    return (
        <div className="flex items-center justify-between">
            <button
                disabled={!previousMonth}
                onClick={() => previousMonth && goToMonth(previousMonth)}
                className={cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 p-0')}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
                <Popover open={isMonthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
                    <PopoverTrigger asChild>
                        <button className={cn(buttonVariants({ variant: 'ghost' }), 'px-2 font-semibold')}>
                           {currentMonth.toLocaleDateString('es-ES', { month: 'long' })}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="center">
                        <div className="grid grid-cols-3 gap-1">
                            {months.map((month, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleMonthSelect(i)}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost' }),
                                        'w-full text-center',
                                        {'bg-accent text-accent-foreground': i === currentMonth.getMonth()}
                                    )}
                                >
                                    {month.toLocaleDateString('es-ES', { month: 'short' })}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <Popover open={isYearPopoverOpen} onOpenChange={setYearPopoverOpen}>
                    <PopoverTrigger asChild>
                        <button className={cn(buttonVariants({ variant: 'ghost' }), 'px-2 font-semibold')}>
                           {currentMonth.getFullYear()}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="center">
                        <div className="h-48 overflow-y-auto grid grid-cols-1 gap-1">
                            {years.map(year => (
                                <button
                                    key={year}
                                    onClick={() => handleYearSelect(year)}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost' }),
                                        'w-full text-center',
                                        {'bg-accent text-accent-foreground': year === currentMonth.getFullYear()}
                                    )}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
             <button
                disabled={!nextMonth}
                onClick={() => nextMonth && goToMonth(nextMonth)}
                className={cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 p-0')}
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    )
}

export { Calendar }

    