import type { IconDefinition, IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CustomIconProps } from "../../types";



export const Icon=({icon,onClick}:CustomIconProps)=>{
    return <FontAwesomeIcon icon={icon} onClick={onClick}/>

}