import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const CustomToolTip = ({
    children,
    isShow = true,
    trigger
}: {
    children: React.ReactNode;
    trigger: React.ReactElement;
    isShow?: boolean;
}) => {
    return (
        isShow ? (
            <Tooltip>
                <TooltipTrigger className="text-inherit decoration-inherit [cursor:inherit] [text-decoration:inherit]">
                    {trigger}
                </TooltipTrigger>
                <TooltipContent>
                    {children}
                </TooltipContent>
            </Tooltip>
        ) : (
            <>{trigger}</>
        )
    );
};

export default CustomToolTip;