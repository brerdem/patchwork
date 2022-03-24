import React, {Fragment, useCallback, useEffect, useRef, useState} from "react";
import {fabric} from 'fabric';
import {saveAs} from 'file-saver';

const useFabric = (onChange) => {
    const fabricRef = useRef();
    const disposeRef = useRef();
    return useCallback((node) => {
        if (node) {
            fabricRef.current = new fabric.Canvas(node);
            if (onChange) {
                disposeRef.current = onChange(fabricRef.current);
            }
        } else if (fabricRef.current) {
            fabricRef.current.dispose();
            if (disposeRef.current) {
                disposeRef.current();
                disposeRef.current = undefined;
            }
        }
    }, []);
};

function App() {

    const [columns, setColumns] = useState(10);
    const [rows, setRows] = useState(15);
    const [canvas, setCanvas] = useState(null);
    const [patchDatas, setPatchDatas] = useState([]);
    const [gridSize, setGridSize] = useState(50);

    const ref = useFabric((fabricCanvas) => {
        if (fabricCanvas) setCanvas(fabricCanvas)
    });

    const addPatch = (patchBase64) => {

        fabric.Image.fromURL(patchBase64, (image) => {

            const {width, height} = image.getOriginalSize();
            console.log('width, height -->', width, height);

            image.set({
                left: 0,
                top: 0,
                fill: '#faa',
                originX: 'left',
                originY: 'top',
                centeredRotation: true,
                borderColor: '#FF0000',
                snapAngle: 90,
                lockScalingY: true,
                lockScalingX: true,

            });
            image.scaleToWidth(gridSize);
            image.scaleToHeight(gridSize)
            canvas.add(image);
        }, {})

    }

    const adjustSize = (type, value) => {
        if (type === 'column') {
            setColumns(value);
        } else {
            setRows(value)
        }

    }

//Select all copied items. numberOfItems is the count of how many items where copied

    const handleCanvasKeyDown = e => {
        console.log('gridSize -->', gridSize);

        if (canvas) { //Handle ctrl+c
            if (e.keyCode === 67) {

                console.log('e.keyCode -->', e.keyCode);
                //reset array with copied objects

                //Get the activeObject and the ActiveGroup

                let activeObject = canvas.getActiveObject();

                //If multiple items are selected the activeGroups will be true
                if (activeObject) {
                    canvas.discardActiveObject();

                    //Push all items from the activeGroup into our array

                    activeObject.clone((clone) => {

                        clone.set({
                            left: clone.left + gridSize,
                            top: clone.top + gridSize,
                            originX: 'left',
                            originY: 'top',
                            centeredRotation: true,
                            borderColor: '#FF0000',
                            snapAngle: 90,
                            lockScalingY: true,
                            lockScalingX: true,
                            evented: true
                        });

                        if (clone.type === 'activeSelection') {
                            // active selection needs a reference to the canvas.
                            clone.canvas = canvas;
                            clone.forEachObject(function (obj) {
                                canvas.add(obj);
                            });
                            // this should solve the unselectability
                            clone.setCoords();
                        } else {
                            canvas.add(clone);
                        }

                        console.log('clone -->', clone);

                        canvas.setActiveObject(clone);
                        canvas.requestRenderAll();

                    });

                }
            }

            if (e.keyCode === 46) {
                const activeObject = canvas.getActiveObject();

                if (activeObject) {
                    canvas.discardActiveObject();

                    if (activeObject.type === 'activeSelection') {
                        // active selection needs a reference to the canvas.

                        activeObject.forEachObject(function (obj) {
                            canvas.remove(obj);
                        });
                        // this should solve the unselectability

                    } else {
                        canvas.remove(activeObject);
                    }

                }
                canvas.requestRenderAll();
            }
        }
    }

    const clearCanvas = () => {
        if (canvas) {
            canvas.clear();
            makeGrid();
        }
    }

    const fileToBase64 = async (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                resolve(reader.result);
                //
            }
            reader.onerror = (e) => reject(e)
        })

    const uploadFile = async (e) => {
        const file = e.target.files[0];
        console.log('file -->', file);
        try {
            const base64 = await fileToBase64(file);
            setPatchDatas([...patchDatas, base64]);
            addPatch(base64);

        } catch (error) {
            console.log('error -->', error);
        }

    }

    const downloadImage = () => {
        if (canvas) {
            const file = canvas.toDataURL({
                format: 'jpg',
                quality: 0.8
            });
            saveAs(file, 'output.jpg');
        }
    }

    const makeGrid = () => {
        if (canvas) {
            for (let i = 0; i < columns; i++) {
                canvas.add(new fabric.Line([i * gridSize, 0, i * gridSize, rows * gridSize], {
                    stroke: '#ccc',
                    selectable: false
                }));
            }
            for (let i = 0; i < rows; i++) {
                canvas.add(new fabric.Line([0, i * gridSize, columns * gridSize, i * gridSize], {
                    stroke: '#ccc',
                    selectable: false
                }));
            }
        }
    }

    useEffect(() => {
        if (columns > 0 && rows > 0) {
            if (canvas) {
                canvas.clear();
                canvas.setDimensions({
                    width: columns * gridSize,
                    height: rows * gridSize
                });

                makeGrid();
                canvas.renderAll();

            }

        }
    }, [columns, rows, canvas, gridSize])

    useEffect(() => {
        if (canvas && gridSize) {
            //canvas.off('object:moving');
            canvas.on('object:moving', function (options) {
                options.target.set({
                    left: Math.round(options.target.left / gridSize) * gridSize,
                    top: Math.round(options.target.top / gridSize) * gridSize
                });
            });
        }

    }, [gridSize, canvas]);

    return (
        <div className="w-full h-screen flex bg-gray-100 flex-row" onKeyDown={handleCanvasKeyDown} tabIndex={0}>
            <div className={'m-8 grow'}>
                <canvas id="canvasWrapper" ref={ref} style={{border: '1px solid red'}}
                        width={columns * gridSize} height={rows * gridSize}/>
            </div>
            <div className={'w-80 bg-gray-200 text-center p-8 flex flex-col items-center'}>
                <h2 className={'text-xl font-bold'}>PATCHWORK</h2>
                <div className={'mt-2 flex flex-row items-center h-20'}>
                    <div className={'m-8 flex flex-col w-10 '}>
                        <label className={'font-bold'}>Sütun</label>
                        <input className={'my-2 pl-4 w-12'} type={'text'} value={columns}
                               onChange={(e) => adjustSize('column', e.target.value)}/>
                    </div>
                    <div className={'m-8 flex flex-col w-10 items-center'}>
                        <label className={'font-bold'}>Sıra</label>
                        <input className={'my-2 pl-4 w-12'} type={'text'} value={rows}
                               onChange={(e) => adjustSize('row', e.target.value)}/>
                    </div>
                    <div className={'m-8 flex flex-col w-10 items-center'}>
                        <label className={'font-bold'}>Grid</label>
                        <input className={'my-2 pl-4 w-12'} type={'text'} value={gridSize}
                               onChange={(e) => setGridSize(parseInt(e.target.value))}/>
                    </div>

                </div>


                <div className={'mt-6 flex p-22 flex-wrap flex-row'}>
                    {Array(9).fill(9).map((x, index) => (
                        <Fragment key={index.toString()}>
                            {patchDatas[index] ? (

                                <img src={patchDatas[index]} className={'m-4'} style={{width: '50px', height: '50px'}}
                                     onClick={() => addPatch(patchDatas[index])}/>

                            ) : (
                                <>
                                    <label htmlFor={`file-${index}`}
                                           className={'flex items-center justify-center border-2 rounded bg-white m-4 w-[50px] h-[50px]'}>+</label>

                                    <input id={`file-${index}`}
                                           type={'file'} hidden accept={'image/*'} onChange={uploadFile}/>
                                </>

                            )}
                        </Fragment>

                    ))}
                </div>

                <div className={'mt-6 flex flex-col'}>
                    <button className={'bg-orange-300 p-2 rounded'} onClick={downloadImage}>İNDİR</button>
                    <button className={'bg-red-300 p-2 rounded mt-8'} onClick={clearCanvas}>TEMİZLE</button>
                </div>
                <div className={'mt-8'}>
                    <p><strong>"C"</strong> kopyalar</p>
                    <p><strong>SHIFT</strong> toplu seçer</p>
                </div>


            </div>
        </div>
    );
}

export default App;
