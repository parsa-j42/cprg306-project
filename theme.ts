import {createTheme} from "@mantine/core";

export const theme = createTheme({
    primaryColor: 'blue',
    defaultRadius: 'md',
    components: {
        Card: {
            defaultProps: {
                shadow: 'sm',
            },
        },
    },
});