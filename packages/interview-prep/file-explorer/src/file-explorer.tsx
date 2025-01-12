type File = {
  parentPath: string[];
  type: "file";
  name: string;
};

type Directory = {
  parentPath: string[];
  type: "directory";
  name: string;
  isOpen: boolean;
  children: Node[];
};

type Node = File | Directory;

const files: Node[] = [];

const addFile = (path: string[], name: string) => {
  const newFile: File = {
    parentPath: path,
    type: "file",
    name,
  };

  files.push(newFile);
};
