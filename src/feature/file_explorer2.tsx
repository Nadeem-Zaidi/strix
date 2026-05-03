import styles from '../module_css/file_explorer.module.css';
import {FileList} from './file_list';

export const UsersFileExplorer = () => {
    return (
        <div className={styles.file_explorer_main}>
            <div className={styles.file_explorer_appbar}>
                <div className={styles.file_explorer_appbar__logo}></div>
            </div>
            <div className={styles['file_explorer_main__components']}>
                <div className={styles.file_explorer_appdrawer}>
                    AppDrawer
                </div>
                <div className={styles.file_explorer_content}>
                    <FileList/>
                </div>
            </div>
        </div>
    );
};